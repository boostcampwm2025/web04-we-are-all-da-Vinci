import { EntityManager, LockMode } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
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
import { MissionService } from "../mission/service/mission.service";
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

  private readonly inviteDailyLimit: number;

  constructor(
    private readonly em: EntityManager,
    configService: ConfigService,
    private readonly chanceWhitelistValidator: ChanceWhitelistValidator,
    private readonly missionService: MissionService,
  ) {
    this.shareDailyChargeLimit =
      configService.get<number>("SHARE_DAILY_CHARGE_LIMIT") ?? 3;
    this.inviteDailyLimit =
      configService.get<number>("INVITE_DAILY_LIMIT") ?? 5;
    // 부팅 시 실제 적용된 한도값을 1줄 남겨 env 미반영(컨테이너 미재생성)을 즉시 감지한다.
    this.logger.log(
      {
        event: "chance.config.loaded",
        shareDailyChargeLimit: this.shareDailyChargeLimit,
        inviteDailyLimit: this.inviteDailyLimit,
      },
      "기회 한도 설정 로드",
    );
  }

  // 읽기 전용. DB를 수정하지 않으므로 차감(consume)과 동시에 호출돼도 lost update가 발생하지 않는다.
  async getMyChance(userKey: number): Promise<{ count: number }> {
    const todayStart = getSeoulDayRange().start;
    const chance = await this.em.findOne(PlayChance, { userKey });
    if (!chance) return { count: 1 };
    return { count: this.computeAvailable(chance, todayStart) };
  }

  @Transactional()
  async chargeByAd(
    userKey: number,
    payload: AdSdkPayload,
  ): Promise<{ count: number }> {
    this.chanceWhitelistValidator.validateAdGroup(userKey, payload);

    const todayStart = getSeoulDayRange().start;
    const chance = await this.findOrCreate(userKey);

    const userRef = this.em.getReference(User, userKey);
    const adView = this.em.create(AdView, {
      type: AdType.DRAWING,
      user: userRef,
    });
    this.em.persist(adView);

    chance.count += 1;
    this.successLog(userKey, "ad", chance.count, {
      adGroupId: payload.adGroupId,
    });
    return { count: this.computeAvailable(chance, todayStart) };
  }

  // 친구 초대(공유) 적립.
  // - 당일 초대 N건째: N < shareDailyChargeLimit(3)이면 기회 +1, 아니면 기회 없이 ShareLog만 기록.
  // - N >= inviteDailyLimit(5)이면 더 받을 보상이 없으므로 거부.
  // 기회를 못 받는 4·5번째 초대도 ShareLog는 남겨, 친구초대 일일 미션 진행에 사용된다.
  @Transactional()
  async chargeByShare(
    userKey: number,
    payload: ShareSdkPayload,
  ): Promise<{ count: number; chanceGranted: boolean }> {
    this.chanceWhitelistValidator.validateShareModule(userKey, payload);

    const { start, end } = getSeoulDayRange();
    const chance = await this.findOrCreate(userKey);

    const beforeCount = await this.em.count(ShareLog, {
      user: { userKey },
      createdAt: { $gte: start, $lt: end },
    });
    if (beforeCount >= this.inviteDailyLimit) {
      this.denyLog(userKey, "share", "daily_cap", payload);
      throw new ForbiddenException("오늘 친구 초대를 모두 완료했어요.");
    }

    const userRef = this.em.getReference(User, userKey);
    this.em.persist(
      this.em.create(ShareLog, {
        user: userRef,
        channel: ShareChannel.CONTACTS_VIRAL,
        moduleId: payload.moduleId,
      }),
    );

    await this.em.flush();
    const inviteCount = await this.em.count(ShareLog, {
      user: { userKey },
      createdAt: { $gte: start, $lt: end },
    });

    const chanceGranted = inviteCount <= this.shareDailyChargeLimit;
    if (chanceGranted) chance.count += 1;

    await this.missionService.syncInviteProgress(userKey, inviteCount);

    this.successLog(userKey, "share", chance.count, {
      channel: payload.channel,
      chanceGranted,
      inviteCount,
    });
    return { count: this.computeAvailable(chance, start), chanceGranted };
  }

  async consume(userKey: number): Promise<{ count: number }> {
    const todayStart = getSeoulDayRange().start;
    const chance = await this.findOrCreate(userKey);

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

  private async findOrCreate(userKey: number): Promise<PlayChance> {
    const existing = await this.em.findOne(
      PlayChance,
      { userKey },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    if (existing) return existing;

    const created = this.em.create(PlayChance, {
      userKey,
      count: 0,
      lastResetAt: new Date(0),
    });
    this.em.persist(created);
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
