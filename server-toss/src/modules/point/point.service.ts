import { EntityManager } from "@mikro-orm/core";
import {
  CreateRequestContext,
  Transactional,
} from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import {
  ExternalPromotionError,
  ExternalTransportError,
} from "src/common/errors/external.errors";
import { getSeoulDateTime, getSeoulDayRange } from "src/common/util/time.util";
import { User } from "src/modules/user/user.entity";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./entity/point-grant-request.entity";
import { PointLog, PointReason } from "./entity/point-log.entity";
import { PointGrantRequestRepository } from "./point-grant-request.repository";
import {
  FAILED_RETENTION_DAYS,
  PROMOTION_AMOUNT,
  PROMOTION_MAX_RETRIES,
  PURGE_BATCH_SIZE,
  SUCCEEDED_RETENTION_DAYS,
} from "./point.contants";
import { PointGrantExecuter } from "./port/point-grant-executer.interface";
import { PointGrantKeyIssuer } from "./port/point-grant-key-issuer.interface";

@Injectable()
export class PointService {
  private readonly logger = new Logger(PointService.name);

  constructor(
    @InjectRepository(PointGrantRequest)
    private readonly pointGrantRequestRepository: PointGrantRequestRepository,
    private readonly em: EntityManager,
    private readonly pointGrantKeyIssuer: PointGrantKeyIssuer,
    private readonly pointGrantExecuter: PointGrantExecuter,
  ) {}

  @Transactional()
  async savePointGrantRequest(
    userKey: number,
    reason: PointReason,
    pointAmount: number = PROMOTION_AMOUNT,
  ): Promise<void> {
    if (!Number.isInteger(pointAmount) || pointAmount <= 0) {
      throw new RangeError("pointAmount는 1 이상의 정수여야 해요");
    }

    const user = this.em.getReference(User, userKey);

    this.pointGrantRequestRepository.create({
      user,
      reason,
      pointAmount,
      status: PointGrantStatus.PENDING,
      maxAttemptCount: PROMOTION_MAX_RETRIES,
      attemptCount: 0,
    });

    await this.pointGrantRequestRepository.getEntityManager().flush();
  }

  // 호출자의 트랜잭션 EntityManager로 보상 요청(PENDING)만 적재한다. flush는 하지 않으며
  // 호출자 트랜잭션 커밋 시 함께 반영된다. 출석 등 상태 전이와 같은 원자 경계에서 적재해
  // "상태는 바뀌었는데 보상만 누락"되는 상황을 막는 용도.
  enqueueGrant(
    em: EntityManager,
    userKey: number,
    reason: PointReason,
    pointAmount: number = PROMOTION_AMOUNT,
  ): void {
    if (!Number.isInteger(pointAmount) || pointAmount <= 0) {
      throw new RangeError("pointAmount는 1 이상의 정수여야 해요");
    }

    em.create(PointGrantRequest, {
      user: em.getReference(User, userKey),
      reason,
      pointAmount,
      status: PointGrantStatus.PENDING,
      maxAttemptCount: PROMOTION_MAX_RETRIES,
      attemptCount: 0,
    });
  }

  // 받은 포인트 합(전체 누적 / KST 오늘).
  // = 지급 성공분(point_logs) + 진행 중 지급(point_grant_requests: PENDING·PROCESSING·RETRY).
  // 진행 중을 포함해 적립 직후(아직 Cron 미처리) 시점에도 즉시 반영하고,
  // 성공 시 한 트랜잭션에서 request→SUCCEEDED(진행중 제외) + PointLog 생성(성공 포함)으로 합계가 정합된다.
  async getPointSummary(
    userKey: number,
  ): Promise<{ totalPoints: number; todayPoints: number }> {
    const em = this.em.fork();
    const { start, end } = getSeoulDayRange();

    const [logs, pendingRequests] = await Promise.all([
      em.find(PointLog, { user: userKey }),
      em.find(PointGrantRequest, {
        user: userKey,
        status: {
          $in: [
            PointGrantStatus.PENDING,
            PointGrantStatus.PROCESSING,
            PointGrantStatus.RETRY,
          ],
        },
      }),
    ]);

    let totalPoints = 0;
    let todayPoints = 0;
    const accumulate = (amount: number, createdAt: Date) => {
      totalPoints += amount;
      if (createdAt >= start && createdAt < end) todayPoints += amount;
    };

    for (const log of logs) {
      accumulate(log.pointAmount, log.createdAt as Date);
    }
    for (const req of pendingRequests) {
      accumulate(req.pointAmount, req.createdAt as Date);
    }

    return { totalPoints, todayPoints };
  }

  @Transactional()
  async lockAndFetchEligibleGrants(): Promise<PointGrantRequest[]> {
    const requests =
      await this.pointGrantRequestRepository.findEligibleGrantsWithLock();

    requests.forEach((request) => request.processing());
    await this.pointGrantRequestRepository.getEntityManager().flush();

    return requests;
  }

  @CreateRequestContext()
  async settleGrantRequests() {
    const requests = await this.lockAndFetchEligibleGrants();

    for (const request of requests) {
      try {
        await this.settleGrantRequest(request);
      } catch (err) {
        this.logger.error(
          {
            event: "point_grant.settle.failed",
            requestId: request.id,
            err,
          },
          "개별 포인트 지급 실패",
        );
      }
    }
  }

  async settleGrantRequest(request: PointGrantRequest): Promise<void> {
    let key: string;

    try {
      key =
        request.pointIdempotencyKey ??
        (await this.issueAndSavePromotionKey(request));
    } catch (err) {
      this.logger.warn(
        {
          event: "point_grant.key_issue.failed",
          requestId: request.id,
          reason: "key_issue_error",
          error: err instanceof Error ? err.message : String(err),
        },
        "프로모션 지급 키 발급 실패 (재시도)",
      );
      request.retry();
      await this.em.flush();
      return;
    }

    try {
      await this.grantPromotion(request, key);
      await this.recordGrantSucceeded(request);
    } catch (err) {
      await this.recordGrantOutcomeFromError(request, err);
    }
  }

  async issueAndSavePromotionKey(request: PointGrantRequest) {
    const { user } = request;

    const key = await this.pointGrantKeyIssuer.getPromotionKey(user.userKey);

    await this.savePointIdempotencyKey(request, key);

    return key;
  }

  @Transactional()
  async savePointIdempotencyKey(request: PointGrantRequest, key: string) {
    request.setPointIdempotencyKey(key);
    await this.pointGrantRequestRepository.getEntityManager().flush();
  }

  @Transactional()
  async recordGrantSucceeded(request: PointGrantRequest) {
    request.succeeded();

    const pointLog = this.em.create(PointLog, {
      user: request.user,
      reason: request.reason,
      pointAmount: request.pointAmount,
    });
    this.em.persist(pointLog);

    await this.em.flush();
  }

  @Transactional()
  async recordGrantOutcomeFromError(request: PointGrantRequest, err: unknown) {
    if (err instanceof ExternalPromotionError && err.errorCode === "4113") {
      await this.recordGrantSucceeded(request);
      return;
    } else if (
      err instanceof ExternalTransportError ||
      (err instanceof ExternalPromotionError && err.errorCode === "4110")
    ) {
      request.retry();
    } else if (err instanceof ExternalPromotionError) {
      request.failed(err.message);

      this.logger.warn(
        `프로모션 지급 실패 (재시도 불필요): ${err instanceof Error ? err.message : String(err)}`,
      );
    } else {
      // DB 에러
      request.retry();
    }

    await this.em.flush();
  }

  async grantPromotion(request: PointGrantRequest, key: string): Promise<void> {
    const { user, pointAmount } = request;

    await this.pointGrantExecuter.executePromotion(
      user.userKey,
      key,
      pointAmount,
    );
  }

  @CreateRequestContext()
  async purgeProcessedGrantRequests(): Promise<{
    succeededDeleted: number;
    failedDeleted: number;
  }> {
    const startedAt = Date.now();
    const now = getSeoulDateTime();
    const succeededCutoff = new Date(
      now.getTime() - SUCCEEDED_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const failedCutoff = new Date(
      now.getTime() - FAILED_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const succeededDeleted = await this.purgeByStatusBefore(
      PointGrantStatus.SUCCEEDED,
      succeededCutoff,
      PURGE_BATCH_SIZE,
    );

    const failedDeleted = await this.purgeByStatusBefore(
      PointGrantStatus.FAILED,
      failedCutoff,
      PURGE_BATCH_SIZE,
    );

    this.logger.log(
      {
        event: "point_grant.purge.succeeded",
        succeededDeleted,
        failedDeleted,
        durationMs: Date.now() - startedAt,
      },
      "포인트 지급 요청 purge 완료",
    );

    return { succeededDeleted, failedDeleted };
  }

  private async purgeByStatusBefore(
    status: PointGrantStatus,
    cutoff: Date,
    batchSize: number,
  ): Promise<number> {
    const targets = await this.em.find(
      PointGrantRequest,
      {
        status,
        processedAt: { $lt: cutoff },
      },
      {
        fields: ["id"],
        orderBy: { processedAt: "ASC" },
        limit: batchSize,
        disableIdentityMap: true,
      },
    );

    const ids = targets.map((target) => target.id);
    if (ids.length === 0) return 0;

    return this.em.nativeDelete(PointGrantRequest, { id: { $in: ids } });
  }
}
