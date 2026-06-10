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
import { getSeoulDateTime } from "src/common/util/time.util";
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
  ): Promise<void> {
    const user = this.em.getReference(User, userKey);

    this.pointGrantRequestRepository.create({
      user,
      reason,
      pointAmount: PROMOTION_AMOUNT,
      status: PointGrantStatus.PENDING,
      maxAttemptCount: PROMOTION_MAX_RETRIES,
      attemptCount: 0,
    });

    await this.pointGrantRequestRepository.getEntityManager().flush();
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
    try {
      const key =
        request.pointIdempotencyKey ??
        (await this.issueAndSavePromotionKey(request));

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
      await this.recordGrantSucceeded(request);
      return;
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

    const succeededDeleted =
      await this.pointGrantRequestRepository.purgeByStatusBefore(
        PointGrantStatus.SUCCEEDED,
        succeededCutoff,
        PURGE_BATCH_SIZE,
      );

    const failedDeleted =
      await this.pointGrantRequestRepository.purgeByStatusBefore(
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
}
