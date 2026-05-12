import { EntityManager } from "@mikro-orm/core";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AdSdkPayload, ShareSdkPayload } from "@toss/shared";
import { getSeoulDayRange } from "src/common/util/time.util";
import { AdType, AdView } from "src/modules/ad/ad-view.entity";
import { User } from "src/modules/user/user.entity";
import { PlayChance } from "./play-chance.entity";
import { ShareChannel, ShareLog } from "./share-log.entity";

@Injectable()
export class ChanceService {
  private readonly logger = new Logger(ChanceService.name);
  private readonly shareDailyChargeLimit: number;
  private readonly adGroupIdWhitelist: ReadonlySet<string>;
  private readonly shareModuleIdWhitelist: ReadonlySet<string>;

  constructor(
    private readonly em: EntityManager,
    configService: ConfigService,
  ) {
    this.shareDailyChargeLimit =
      configService.get<number>("SHARE_DAILY_CHARGE_LIMIT") ?? 5;
    this.adGroupIdWhitelist = parseCsvSet(
      configService.get<string>("AD_GROUP_ID_WHITELIST"),
    );
    this.shareModuleIdWhitelist = parseCsvSet(
      configService.get<string>("SHARE_MODULE_ID_WHITELIST"),
    );
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
    if (this.adGroupIdWhitelist.size === 0) {
      // 운영 환경변수 누락은 클라이언트 권한 문제가 아닌 시스템 설정 오류 → 5xx + error 로그로 알람 유도
      this.logger.error(
        {
          event: "chance.charge.failed",
          userKey,
          op: "ad",
          reason: "whitelist_empty",
        },
        "광고 그룹 화이트리스트 환경변수가 비어 있어요.",
      );
      throw new ServiceUnavailableException(
        "광고 그룹 화이트리스트가 비어 있어요. 운영자에게 문의해주세요.",
      );
    }
    if (!this.adGroupIdWhitelist.has(payload.adGroupId)) {
      this.denyLog(userKey, "ad", "whitelist_miss", payload);
      throw new ForbiddenException("등록되지 않은 광고예요.");
    }

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
    if (this.shareModuleIdWhitelist.size === 0) {
      this.logger.error(
        {
          event: "chance.charge.failed",
          userKey,
          op: "share",
          reason: "whitelist_empty",
        },
        "공유 모듈 화이트리스트 환경변수가 비어 있어요.",
      );
      throw new ServiceUnavailableException(
        "공유 리워드 화이트리스트가 비어 있어요. 운영자에게 문의해주세요.",
      );
    }
    if (!this.shareModuleIdWhitelist.has(payload.moduleId)) {
      this.denyLog(userKey, "share", "whitelist_miss", payload);
      throw new ForbiddenException("등록되지 않은 공유 리워드예요.");
    }

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

  async consume(userKey: number): Promise<{ count: number }> {
    return this.em.transactional((em) =>
      this.consumeWithEntityManager(em, userKey),
    );
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

    if (existing.lastResetAt < start) {
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

const parseCsvSet = (value: string | undefined): ReadonlySet<string> => {
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean),
  );
};
