import { EntityManager } from "@mikro-orm/core";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getSeoulDayRange } from "src/common/util/time.util";
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
import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { PointGrantRequestRepository } from "./point-grant-request.repository";

const PROMOTION_AMOUNT = 2;
const PROMOTION_MAX_RETRIES = 2;

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
    const em = this.em.fork();
    const { start, end } = getSeoulDayRange();
    const count = await em.count(PointLog, {
      user: { userKey },
      reason: PointReason.DRAWING,
      createdAt: { $gte: start, $lt: end },
    });
    return count < 2;
  }

  @Transactional()
  async savePointGrantRequest(user: User, reason: PointReason): Promise<void> {
    const request = this.em.create(PointGrantRequest, {
      user,
      reason,
      pointAmount: PROMOTION_AMOUNT,
      status: PointGrantStatus.PENDING,
      maxAttemptCount: PROMOTION_MAX_RETRIES,
      attemptCount: 0,
    });

    this.em.persist(request);
    await this.em.flush();
  }

  async settleGrantRequests() {
    const requests = await this.lockAndFetchEligibleGrants();

    for (const request of requests) {
      await this.settleGrantRequest(request);
    }
  }

  async settleGrantRequest(request: PointGrantRequest): Promise<void> {
    try {
      await this.grantDrawingPromotion(request);
      await this.recordGrantSucceeded(request);
    } catch (err) {
      await this.recordGrantFailedOrRetry(request, err);
    }
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
      request.failed();
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

  async saveDrawingPointLog(userKey: number): Promise<void> {
    const em = this.em.fork();
    const userRef = em.getReference(User, userKey);
    const log = new PointLog();
    log.user = userRef;
    log.reason = PointReason.DRAWING;
    log.pointAmount = PROMOTION_AMOUNT;
    em.persist(log);
    await em.flush();
  }

  async grantDrawingPromotion(request: PointGrantRequest): Promise<void> {
    const { user, pointAmount } = request;
    const key = await this.tossApiClient.getPromotionKey(user.userKey);

    await this.tossApiClient.executePromotion(
      user.userKey,
      key,
      this.promotionCode,
      pointAmount,
    );
  }

  async grantDrawingPromotionIfEligible(userKey: number): Promise<boolean> {
    const canGrant = await this.canGrantTodayPromotion(userKey);
    if (!canGrant) return false;

    let lastError: unknown;

    for (let attempt = 0; attempt <= PROMOTION_MAX_RETRIES; attempt++) {
      try {
        const key = await this.tossApiClient.getPromotionKey(userKey);
        await this.tossApiClient.executePromotion(
          userKey,
          key,
          this.promotionCode,
          PROMOTION_AMOUNT,
        );
        await this.saveDrawingPointLog(userKey);
        return true;
      } catch (err) {
        if (
          err instanceof TossTransportError ||
          (err instanceof TossPromotionError && err.errorCode === "4110")
        ) {
          lastError = err;
          continue;
        }
        this.logger.warn(
          `프로모션 지급 실패 (재시도 불필요): ${err instanceof Error ? err.message : String(err)}`,
        );
        return false;
      }
    }

    this.logger.warn(
      `프로모션 지급 최대 재시도 초과: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
    return false;
  }
}
