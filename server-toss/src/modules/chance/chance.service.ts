import { EntityManager } from "@mikro-orm/core";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AdSdkPayload, ShareSdkPayload } from "@toss/shared";
import { getSeoulDayRange } from "src/common/util/time.util";
import { AdType, AdView } from "src/modules/chance/ad-view.entity";
import { User } from "src/modules/user/user.entity";
import { ChanceWhitelistValidator } from "./chance-whitelist.validator";
import { PlayChance } from "./play-chance.entity";
import { ShareChannel, ShareLog } from "./share-log.entity";

@Injectable()
export class ChanceService {
  private readonly logger = new Logger(ChanceService.name);
  private readonly shareDailyChargeLimit: number;

  constructor(
    private readonly em: EntityManager,
    configService: ConfigService,
    private readonly chanceWhitelistValidator: ChanceWhitelistValidator,
  ) {
    this.shareDailyChargeLimit =
      configService.get<number>("SHARE_DAILY_CHARGE_LIMIT") ?? 5;
  }

  async getMyChance(userKey: number): Promise<{ count: number }> {
    return this.em.transactional(async (em) => {
      const chance = await this.getOrInitWithReset(em, userKey);
      return { count: chance.count };
    });
  }

  async chargeByAd(
    userKey: number,
    payload: AdSdkPayload,
  ): Promise<{ count: number }> {
    this.chanceWhitelistValidator.validateAdGroup(userKey, payload);

    return this.em.transactional(async (em) => {
      const chance = await this.getOrInitWithReset(em, userKey);

      const userRef = em.getReference(User, userKey);
      const adView = em.create(AdView, {
        type: AdType.DRAWING,
        user: userRef,
      });
      em.persist(adView);

      chance.count += 1;
      this.successLog(userKey, "ad", chance.count, {
        adGroupId: payload.adGroupId,
      });
      return { count: chance.count };
    });
  }

  async chargeByShare(
    userKey: number,
    payload: ShareSdkPayload,
  ): Promise<{ count: number }> {
    this.chanceWhitelistValidator.validateShareModule(userKey, payload);

    return this.em.transactional(async (em) => {
      const { start, end } = getSeoulDayRange();
      const chance = await this.getOrInitWithReset(em, userKey, start);

      const todayShareLogs = await em.count(ShareLog, {
        user: { userKey },
        createdAt: { $gte: start, $lt: end },
      });
      if (todayShareLogs >= this.shareDailyChargeLimit) {
        this.denyLog(userKey, "share", "daily_cap", payload);
        throw new ForbiddenException("오늘 공유 적립 횟수를 모두 사용했어요.");
      }

      const userRef = em.getReference(User, userKey);
      const shareLog = em.create(ShareLog, {
        user: userRef,
        channel: ShareChannel.CONTACTS_VIRAL,
        moduleId: payload.moduleId,
      });
      em.persist(shareLog);

      chance.count += 1;
      this.successLog(userKey, "share", chance.count, {
        channel: payload.channel,
      });
      return { count: chance.count };
    });
  }

  async consumeWithEntityManager(
    em: EntityManager,
    userKey: number,
  ): Promise<{ count: number }> {
    const chance = await this.getOrInitWithReset(em, userKey);

    if (chance.count <= 0) {
      this.denyLog(userKey, "consume", "no_chance");
      throw new ConflictException("그리기 기회가 부족해요.");
    }

    chance.count -= 1;
    this.successLog(userKey, "consume", chance.count);
    return { count: chance.count };
  }

  private async getOrInitWithReset(
    em: EntityManager,
    userKey: number,
    todayStart?: Date,
  ): Promise<PlayChance> {
    const start = todayStart ?? getSeoulDayRange().start;
    const existing = await em.findOne(PlayChance, { userKey });

    if (!existing) {
      const created = em.create(PlayChance, {
        userKey,
        count: 1,
        lastResetAt: start,
      });
      em.persist(created);
      return created;
    }

    // MikroORM date 컬럼은 driver에 따라 string("YYYY-MM-DD")으로 매핑되어
    // Date 객체와 직접 비교 시 NaN으로 떨어져 reset 분기를 못 탐. Date로 정규화 후 비교.
    const lastResetTime = new Date(existing.lastResetAt).getTime();
    if (lastResetTime < start.getTime()) {
      existing.count = Math.max(existing.count, 1);
      existing.lastResetAt = start;
    }

    return existing;
  }

  private successLog(
    userKey: number,
    op: "ad" | "share" | "consume",
    count: number,
    meta?: Record<string, unknown>,
  ): void {
    const action = op === "consume" ? "consume" : "charge";
    const koreanAction = op === "consume" ? "소비" : "충전";
    this.logger.log(
      {
        event: `chance.${action}.succeeded`,
        userKey,
        op,
        count,
        ...meta,
      },
      `기회 ${koreanAction} 성공`,
    );
  }

  private denyLog(
    userKey: number,
    op: "ad" | "share" | "consume",
    reason: string,
    meta?: Record<string, unknown>,
  ): void {
    const action = op === "consume" ? "consume" : "charge";
    const koreanAction = op === "consume" ? "소비" : "충전";
    this.logger.warn(
      {
        event: `chance.${action}.denied`,
        userKey,
        op,
        reason,
        ...meta,
      },
      `기회 ${koreanAction} 거부`,
    );
  }
}
