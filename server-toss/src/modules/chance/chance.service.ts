import { EntityManager, LockMode } from "@mikro-orm/core";
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

// 기회 모델
// - count: 광고/공유로 충전한 추가 기회. 일일 리셋 없이 다음 날로 이월된다.
// - lastResetAt: 무료 플레이를 마지막으로 사용한 날(KST). 오늘보다 과거면 오늘 무료 1회 가능.
// - 클라이언트에 노출하는 "기회 수" = count + (오늘 무료 가능 ? 1 : 0).
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

  // 읽기 전용. DB를 수정하지 않으므로 차감(consume)과 동시에 호출돼도 lost update가 발생하지 않는다.
  async getMyChance(userKey: number): Promise<{ count: number }> {
    const todayStart = getSeoulDayRange().start;
    const chance = await this.em.findOne(PlayChance, { userKey });
    if (!chance) return { count: 1 };
    return { count: this.computeAvailable(chance, todayStart) };
  }

  async chargeByAd(
    userKey: number,
    payload: AdSdkPayload,
  ): Promise<{ count: number }> {
    this.chanceWhitelistValidator.validateAdGroup(userKey, payload);

    return this.em.transactional(async (em) => {
      const todayStart = getSeoulDayRange().start;
      const chance = await this.findOrCreate(em, userKey);

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
      return { count: this.computeAvailable(chance, todayStart) };
    });
  }

  async chargeByShare(
    userKey: number,
    payload: ShareSdkPayload,
  ): Promise<{ count: number }> {
    this.chanceWhitelistValidator.validateShareModule(userKey, payload);

    return this.em.transactional(async (em) => {
      const { start, end } = getSeoulDayRange();
      const chance = await this.findOrCreate(em, userKey);

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
      return { count: this.computeAvailable(chance, start) };
    });
  }

  async consumeWithEntityManager(
    em: EntityManager,
    userKey: number,
  ): Promise<{ count: number }> {
    const todayStart = getSeoulDayRange().start;
    const chance = await this.findOrCreate(em, userKey);

    // 당일 첫 플레이는 무료 — 충전분(count)을 차감하지 않고 무료 사용일만 갱신한다.
    if (this.isFreeAvailable(chance.lastResetAt, todayStart)) {
      chance.lastResetAt = todayStart;
      this.successLog(userKey, "consume", chance.count, { free: true });
      return { count: chance.count };
    }

    if (chance.count <= 0) {
      this.denyLog(userKey, "consume", "no_chance");
      throw new ConflictException("그리기 기회가 부족해요.");
    }

    chance.count -= 1;
    this.successLog(userKey, "consume", chance.count);
    return { count: chance.count };
  }

  // 변경(차감/충전) 경로 전용. PESSIMISTIC_WRITE로 행을 잠가 동시 변경을 직렬화한다.
  private async findOrCreate(
    em: EntityManager,
    userKey: number,
  ): Promise<PlayChance> {
    const existing = await em.findOne(
      PlayChance,
      { userKey },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    if (existing) return existing;

    // 새 행: lastResetAt을 epoch로 둬서 무료 플레이가 아직 사용 가능한 상태로 만든다.
    const created = em.create(PlayChance, {
      userKey,
      count: 0,
      lastResetAt: new Date(0),
    });
    em.persist(created);
    return created;
  }

  // 양변을 KST 자정으로 정규화해 비교한다. driver/컬럼 타입에 따라 lastResetAt이
  // string("YYYY-MM-DD")이나 UTC 자정 Date로 들어와도 같은 KST 날짜면 동일하게 취급.
  private isFreeAvailable(lastResetAt: Date, todayStart: Date): boolean {
    const lastResetSeoulStart = getSeoulDayRange(
      new Date(lastResetAt),
    ).start.getTime();
    return lastResetSeoulStart < todayStart.getTime();
  }

  private computeAvailable(chance: PlayChance, todayStart: Date): number {
    const freeBonus = this.isFreeAvailable(chance.lastResetAt, todayStart)
      ? 1
      : 0;
    return chance.count + freeBonus;
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
