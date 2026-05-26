import { EntityManager } from "@mikro-orm/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getSeoulDateTime, getSeoulDayRange } from "src/common/util/time.util";
import { TossApiClient } from "src/modules/auth/toss-api.client";
import {
  TossPromotionError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import { User } from "src/modules/user/user.entity";
import { PointLog, PointReason } from "./point-log.entity";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./point-grant-request.entity";
import {
  CreateRequestContext,
  Transactional,
} from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { PointGrantRequestRepository } from "./point-grant-request.repository";

const PROMOTION_AMOUNT = 2;
const PROMOTION_MAX_RETRIES = 3;
const PURGE_BATCH_SIZE = 100;
const SUCCEEDED_RETENTION_DAYS = 7;
const FAILED_RETENTION_DAYS = 30;

@Injectable()
export class PointService {
  private readonly logger = new Logger(PointService.name);
  private readonly promotionCode: string;

  constructor(
    @InjectRepository(PointGrantRequest)
    private readonly pointGrantRequestRepository: PointGrantRequestRepository,
    private readonly em: EntityManager,
    private readonly tossApiClient: TossApiClient,
    private readonly configService: ConfigService,
  ) {
    const promotionCode =
      this.configService.getOrThrow<string>("PROMOTION_CODE");
    const isProduction =
      this.configService.get<string>("NODE_ENV") === "production";

    this.promotionCode = isProduction ? promotionCode : `TEST_${promotionCode}`;
  }

  async canGrantTodayPromotion(userKey: number): Promise<boolean> {
    const { start, end } = getSeoulDayRange();
    const count = await this.em.count(PointLog, {
      user: { userKey },
      reason: PointReason.DRAWING,
      createdAt: { $gte: start, $lt: end },
    });
    return count < 2;
  }

  @Transactional()
  async savePointGrantRequest(
    user: User,
    reason: PointReason,
  ): Promise<boolean> {
    const promotionGranted = await this.canGrantTodayPromotion(user.userKey);

    if (!promotionGranted) {
      return false;
    }
    this.pointGrantRequestRepository.create({
      user,
      reason,
      pointAmount: PROMOTION_AMOUNT,
      status: PointGrantStatus.PENDING,
      maxAttemptCount: PROMOTION_MAX_RETRIES,
      attemptCount: 0,
    });

    await this.pointGrantRequestRepository.getEntityManager().flush();
    return true;
  }

  @CreateRequestContext()
  async settleGrantRequests() {
    const requests = await this.lockAndFetchEligibleGrants();

    for (const request of requests) {
      await this.settleGrantRequest(request);
    }
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

  async settleGrantRequest(request: PointGrantRequest): Promise<void> {
    try {
      // TODO: canGrant 체크

      const key =
        request.pointIdempotencyKey ??
        (await this.issueAndSavePromotionKey(request));

      await this.grantDrawingPromotion(request, key);
      await this.recordGrantSucceeded(request);
    } catch (err) {
      await this.recordGrantFailedOrRetry(request, err);
    }
  }

  async issueAndSavePromotionKey(request: PointGrantRequest) {
    const { user } = request;

    const key = await this.tossApiClient.getPromotionKey(user.userKey);

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
  async recordGrantFailedOrRetry(request: PointGrantRequest, err: unknown) {
    if (
      err instanceof TossTransportError ||
      (err instanceof TossPromotionError && err.errorCode === "4110")
    ) {
      request.retry();
    } else if (err instanceof TossPromotionError) {
      request.failed(err.message);

      this.logger.warn(
        `프로모션 지급 실패 (재시도 불필요): ${err instanceof Error ? err.message : String(err)}`,
      );
    } else {
      request.retry();
    }

    await this.em.flush();
  }

  @Transactional()
  async lockAndFetchEligibleGrants(): Promise<PointGrantRequest[]> {
    const requests =
      await this.pointGrantRequestRepository.findEligibleGrantsWithLock();

    requests.forEach((request) => request.processing());
    await this.pointGrantRequestRepository.getEntityManager().flush();

    return requests;
  }

  async grantDrawingPromotion(
    request: PointGrantRequest,
    key: string,
  ): Promise<void> {
    const { user, pointAmount } = request;

    await this.tossApiClient.executePromotion(
      user.userKey,
      key,
      this.promotionCode,
      pointAmount,
    );
  }
}
