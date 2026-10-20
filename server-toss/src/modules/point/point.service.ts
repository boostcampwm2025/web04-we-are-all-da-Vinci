import { EntityManager } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import {
  ExternalApiError,
  ExternalPromotionError,
  ExternalRateLimitError,
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
import {
  PointGrantExecuter,
  PointGrantResult,
} from "./port/point-grant-executer.interface";
import { PointGrantKeyIssuer } from "./port/point-grant-key-issuer.interface";
import { TossBusinessErrorCode } from "src/external/toss/common/toss.errors";

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

  enqueueGrant(
    userKey: number,
    reason: PointReason,
    pointAmount: number = PROMOTION_AMOUNT,
  ): void {
    if (!Number.isInteger(pointAmount) || pointAmount <= 0) {
      throw new RangeError("pointAmount는 1 이상의 정수여야 해요");
    }

    this.em.create(PointGrantRequest, {
      user: this.em.getReference(User, userKey),
      reason,
      pointAmount,
      status: PointGrantStatus.PENDING,
      maxAttemptCount: PROMOTION_MAX_RETRIES,
      attemptCount: 0,
    });
  }

  // 받은 포인트 합(전체 누적 / KST 오늘).
  // = 지급 성공분(point_logs) + 진행 중 지급(point_grant_requests: PENDING·PROCESSING·RETRY·SUSPENDED).
  // 진행 중을 포함해 적립 직후(아직 Cron 미처리) 시점에도 즉시 반영하고,
  // 성공 시 한 트랜잭션에서 request→SUCCEEDED(진행중 제외) + PointLog 생성(성공 포함)으로 합계가 정합된다.
  async getPointSummary(
    userKey: number,
  ): Promise<{ totalPoints: number; todayPoints: number }> {
    const { start, end } = getSeoulDayRange();

    const [logs, pendingRequests] = await Promise.all([
      this.em.find(PointLog, { user: userKey }),
      this.em.find(PointGrantRequest, {
        user: userKey,
        status: {
          $in: [
            PointGrantStatus.PENDING,
            PointGrantStatus.PROCESSING,
            PointGrantStatus.RETRY,
            PointGrantStatus.SUSPENDED,
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
    await this.em.flush();

    return requests;
  }

  async settleGrantRequests(): Promise<boolean> {
    const requests = await this.lockAndFetchEligibleGrants();

    let isSuspended = false;
    const processing = [];
    for (let i = 0; i < requests.length; ++i) {
      const request = requests[i];

      try {
        const settledRequest = await this.settleGrantRequest(request);

        if (settledRequest.isSuspended()) {
          // SUSPENDED 발생하면 워커를 중단하고 선점 요청 반환
          isSuspended = true;
          processing.push(...requests.slice(i + 1));
          break;
        }
      } catch (err) {
        this.logger.error(
          {
            event: "point_grant.settle.failed",
            requestId: request.id,
            err,
          },
          "포인트 지급 실패로 현재 배치 종료; PROCESSING 요청은 lease 만료 후 복구",
        );
        // rollback은 공유 엔티티 상태를 되돌리지 않으므로 같은 EM으로 추가 flush하지 않는다.
        break;
      }
    }
    if (isSuspended) {
      try {
        await this.releaseRequests(processing);
      } catch (err) {
        this.logger.error(
          {
            event: "point_grant.release.failed",
            requestIds: processing.map(({ id }) => id),
            err,
          },
          "미처리 포인트 지급 요청 반환 실패; 재시작 후 lease 복구 필요",
        );
      }
    }
    return isSuspended;
  }

  async settleGrantRequest(
    request: PointGrantRequest,
  ): Promise<PointGrantRequest> {
    try {
      const promotionResult = await this.getPromotionResult(request);

      if (promotionResult) {
        return await this.handleExistingResult(request, promotionResult);
      }

      return await this.issueAndGrant(request);
    } catch (err) {
      return await this.handleGrantError(err, request);
    }
  }

  async handleExistingResult(
    request: PointGrantRequest,
    result: PointGrantResult,
  ) {
    switch (result.type) {
      case "PENDING":
        await this.recordGrantWait(request);
        break;
      case "SUCCESS":
        await this.recordGrantSucceeded(request);
        break;
      case "FAILED":
      case "NOT_FOUND":
        // FAILED:
        // 포인트 회수되었기 때문에 다시 포인트 지급해야 한다.
        // 그대로 진행해서 키를 재발급한다.
        // NOT_FOUND:
        // 포인트 지급 내역 존재하지 않음.
        // ex) 키 발급 후 지급 요청 중 오류난 경우
        // 그대로 진행해서 키를 재발급한다.
        await this.clearKey(request);
        await this.issueAndGrant(request);
        break;
    }
    return request;
  }

  async handleNewResult(request: PointGrantRequest, result: PointGrantResult) {
    switch (result.type) {
      case "PENDING":
        await this.recordGrantWait(request);
        break;
      case "SUCCESS":
        await this.recordGrantSucceeded(request);
        break;
      case "FAILED":
      case "NOT_FOUND":
        // FAILED:
        // 포인트 회수되었기 때문에 다시 포인트 지급해야 한다.
        // 키를 초기화하고 다음 워커에서 재처리하도록 한다.
        // NOT_FOUND:
        // 포인트 지급 내역 존재하지 않음.
        // ex) 키 발급 후 지급 요청 중 오류난 경우
        // 키를 초기화해서 다음 워커에서 재처리하도록 한다.
        await this.clearKeyAndRetry(request);
        break;
    }
    return request;
  }

  private async handleGrantError(err: unknown, request: PointGrantRequest) {
    if (err instanceof ExternalRateLimitError) {
      await this.recordGrantWait(request, err.msBeforeNext);
      return request;
    } else if (err instanceof ExternalTransportError) {
      await this.recordGrantRetry(request);
      return request;
    } else if (err instanceof ExternalApiError) {
      if (err.statusCode >= 500) {
        await this.recordGrantRetry(request);
        return request;
      } else if (err.statusCode == 429) {
        // Too Many Requests
        await this.recordGrantWait(request);
        return request;
      } else if (err.statusCode >= 400) {
        await this.recordGrantSuspended(request);
        return request;
      }
    } else if (err instanceof ExternalPromotionError) {
      switch (err.errorCode) {
        case TossBusinessErrorCode.PROMOTION_ENDED.errorCode:
        case TossBusinessErrorCode.PROMOTION_NOT_APPROVED.errorCode:
        case TossBusinessErrorCode.PROMOTION_NOT_FOUND.errorCode:
        case TossBusinessErrorCode.PROMOTION_NOT_RUNNING.errorCode:
        case TossBusinessErrorCode.AUTHENTICATION_NOT_FOUND.errorCode:
        case TossBusinessErrorCode.WORKSPACE_NOT_FOUND_OR_FORBIDDEN.errorCode:
        case TossBusinessErrorCode.REWARD_AMOUNT_EXCEEDED.errorCode:
        case TossBusinessErrorCode.INSUFFICIENT_PROMOTION_MONEY.errorCode:
        case TossBusinessErrorCode.BAD_REQUEST.errorCode:
          await this.recordGrantSuspended(request);
          break;
        case TossBusinessErrorCode.REWARD_PROCESS_FAILED.errorCode:
        case TossBusinessErrorCode.ALREADY_PROCESSED.errorCode:
          await this.recordGrantRetry(request);
          break;
        default:
          throw err;
      }
      return request;
    }
    throw err;
  }

  async issueAndGrant(request: PointGrantRequest) {
    const key = await this.issueKey(request);
    await this.savePointIdempotencyKey(request, key);

    await this.grantPromotion(request, key);
    const result = await this.getPromotionResult(request);

    if (result) {
      return await this.handleNewResult(request, result);
    }
    await this.recordGrantRetry(request);
    return request;
  }

  async getPromotionResult(request: PointGrantRequest) {
    if (!request.pointIdempotencyKey) {
      return null;
    }

    return await this.pointGrantExecuter.getPromotionResult(
      request.user.userKey,
      request.pointIdempotencyKey,
    );
  }

  async issueKey(request: PointGrantRequest) {
    const { user } = request;

    return await this.pointGrantKeyIssuer.getPromotionKey(user.userKey);
  }

  @Transactional()
  async recordGrantSuspended(request: PointGrantRequest) {
    request.suspend();
    await this.em.flush();
  }

  @Transactional()
  async clearKeyAndRetry(request: PointGrantRequest) {
    request.clearKey();
    request.retry();
    await this.em.flush();
  }

  @Transactional()
  async clearKey(request: PointGrantRequest) {
    request.clearKey();
    await this.em.flush();
  }

  @Transactional()
  async savePointIdempotencyKey(request: PointGrantRequest, key: string) {
    request.setPointIdempotencyKey(key);
    await this.em.flush();
  }

  @Transactional()
  async recordGrantSucceeded(request: PointGrantRequest) {
    request.succeeded();

    const pointLog = this.em.create(PointLog, {
      pointGrantRequestId: request.id,
      user: request.user,
      reason: request.reason,
      pointAmount: request.pointAmount,
    });
    this.em.persist(pointLog);

    await this.em.flush();
  }

  @Transactional()
  async recordGrantRetry(request: PointGrantRequest) {
    request.retry();
    await this.em.flush();
  }

  @Transactional()
  async recordGrantWait(request: PointGrantRequest, waitUntil?: number) {
    request.wait(waitUntil);
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

  @Transactional()
  async recoverSuspended() {
    const exist =
      await this.pointGrantRequestRepository.existSuspendedRequests();
    if (!exist) {
      return;
    }
    await this.pointGrantRequestRepository.updateSuspendedToPending();
  }

  @Transactional()
  async releaseRequests(requests: PointGrantRequest[]) {
    for (const request of requests) {
      request.pending();
    }

    await this.em.flush();
  }
}
