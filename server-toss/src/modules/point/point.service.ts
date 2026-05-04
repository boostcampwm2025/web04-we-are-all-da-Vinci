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

const PROMOTION_AMOUNT = 2;
const PROMOTION_MAX_RETRIES = 2;

@Injectable()
export class PointService {
  private readonly logger = new Logger(PointService.name);
  private readonly promotionCode: string;

  constructor(
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
