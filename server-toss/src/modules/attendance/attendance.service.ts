import { EntityManager, LockMode } from "@mikro-orm/core";
import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AdSdkPayload,
  AttendanceCheckInResponse,
  AttendanceRecoverResponse,
  AttendanceStatusResponse,
} from "@toss/shared";
import { DAY_DURATION_MS, getSeoulDayRange } from "src/common/util/time.util";
import { AdType, AdView } from "src/modules/chance/ad-view.entity";
import { PointReason } from "src/modules/point/entity/point-log.entity";
import { PointService } from "src/modules/point/point.service";
import { User } from "src/modules/user/user.entity";
import { Attendance } from "./attendance.entity";
import { nextCycleDay, rewardedDayFor, tomorrowMaxPoint } from "./lib/cycle";

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly recoveryAdGroupId: string;

  constructor(
    private readonly em: EntityManager,
    private readonly pointService: PointService,
    configService: ConfigService,
  ) {
    this.recoveryAdGroupId = configService.getOrThrow<string>(
      "ATTENDANCE_AD_GROUP_ID",
    );
  }

  // KST 자정 기준 하루 시작 시각(ms). 저장값/오늘을 같은 기준으로 비교한다.
  private dayStartMs(date: Date): number {
    return getSeoulDayRange(date).start.getTime();
  }

  async checkIn(userKey: number): Promise<AttendanceCheckInResponse> {
    const todayStart = getSeoulDayRange().start;
    const today = todayStart.getTime();
    const yesterday = today - DAY_DURATION_MS;

    const { result, rewardedDay } = await this.em.transactional(async (em) => {
      const attendance = await em.findOne(
        Attendance,
        { userKey },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      // 첫 출석
      if (!attendance) {
        em.create(Attendance, {
          userKey,
          cycleDay: 1,
          lastCheckedDate: todayStart,
          recoverableDay: null,
        });
        await em.flush();
        return {
          result: {
            status: "started" as const,
            cycleDay: 1,
            recoverable: false,
            previousDay: null,
            rewardedDay: null,
          },
          rewardedDay: null as number | null,
        };
      }

      const lastDay = this.dayStartMs(attendance.lastCheckedDate);

      // 오늘 이미 출석 — 멱등 재호출(전이·지급 없음)
      if (lastDay === today) {
        return {
          result: {
            status: "already" as const,
            cycleDay: attendance.cycleDay,
            recoverable: attendance.recoverableDay != null,
            previousDay: attendance.recoverableDay ?? null,
            rewardedDay: null,
          },
          rewardedDay: null as number | null,
        };
      }

      // 어제에 이어 연속 출석
      if (lastDay === yesterday) {
        const newDay = nextCycleDay(attendance.cycleDay);
        attendance.cycleDay = newDay;
        attendance.recoverableDay = null;
        attendance.lastCheckedDate = todayStart;
        await em.flush();

        const milestone = rewardedDayFor(newDay);
        return {
          result: {
            status: "continued" as const,
            cycleDay: newDay,
            recoverable: false,
            previousDay: null,
            rewardedDay: milestone,
          },
          rewardedDay: milestone,
        };
      }

      // 갭(어제 이전) — 끊김 리셋. 오늘은 1일차로 출석 처리하고 직전 위치를 복구 대상으로 보관.
      const previousDay = attendance.cycleDay;
      attendance.recoverableDay = previousDay;
      attendance.cycleDay = 1;
      attendance.lastCheckedDate = todayStart;
      await em.flush();

      return {
        result: {
          status: "reset_recoverable" as const,
          cycleDay: 1,
          recoverable: true,
          previousDay,
          rewardedDay: null,
        },
        rewardedDay: null as number | null,
      };
    });

    if (rewardedDay != null) {
      await this.grantMilestoneReward(userKey, rewardedDay, "check_in");
    }

    this.logger.log(
      {
        event: "attendance.check_in.succeeded",
        userKey,
        status: result.status,
        cycleDay: result.cycleDay,
        rewardedDay,
      },
      "출석 체크 완료",
    );

    return result;
  }

  async recover(
    userKey: number,
    payload: AdSdkPayload,
  ): Promise<AttendanceRecoverResponse> {
    if (payload.adGroupId !== this.recoveryAdGroupId) {
      this.logger.warn(
        {
          event: "attendance.recover.denied",
          userKey,
          reason: "whitelist_miss",
          adGroupId: payload.adGroupId,
        },
        "출석 복구 거부",
      );
      throw new ForbiddenException("등록되지 않은 광고예요.");
    }

    const { newDay, rewardedDay } = await this.em.transactional(async (em) => {
      const attendance = await em.findOne(
        Attendance,
        { userKey },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      if (!attendance || attendance.recoverableDay == null) {
        this.logger.warn(
          {
            event: "attendance.recover.denied",
            userKey,
            reason: "not_recoverable",
          },
          "복구할 연속 출석이 없어요",
        );
        throw new ForbiddenException("복구할 연속 출석이 없어요.");
      }

      const restored = nextCycleDay(attendance.recoverableDay);
      attendance.cycleDay = restored;
      attendance.recoverableDay = null;

      em.create(AdView, {
        type: AdType.ATTENDANCE_RECOVERY,
        user: em.getReference(User, userKey),
      });

      await em.flush();

      return { newDay: restored, rewardedDay: rewardedDayFor(restored) };
    });

    if (rewardedDay != null) {
      await this.grantMilestoneReward(userKey, rewardedDay, "recover");
    }

    this.logger.log(
      {
        event: "attendance.recover.succeeded",
        userKey,
        cycleDay: newDay,
        rewardedDay,
      },
      "연속 출석 복구 완료",
    );

    return { cycleDay: newDay, rewardedDay };
  }

  async getStatus(userKey: number): Promise<AttendanceStatusResponse> {
    const today = getSeoulDayRange().start.getTime();
    const attendance = await this.em.findOne(Attendance, { userKey });

    if (!attendance) {
      return {
        cycleDay: 0,
        checkedToday: false,
        recoverable: false,
        previousDay: null,
        tomorrowMaxPoint: 0,
      };
    }

    const checkedToday = this.dayStartMs(attendance.lastCheckedDate) === today;

    return {
      cycleDay: attendance.cycleDay,
      checkedToday,
      recoverable: attendance.recoverableDay != null,
      previousDay: attendance.recoverableDay ?? null,
      tomorrowMaxPoint: tomorrowMaxPoint(attendance.cycleDay),
    };
  }

  // 마일스톤(3·7일) 도달 시 단일 프로모션(고정 5P) 적재. 트랜잭션 커밋 후 호출되며,
  // 보상 결정 자체는 attendance 행 잠금 하에서 1회만 내려지므로 중복 적재되지 않는다.
  private async grantMilestoneReward(
    userKey: number,
    rewardedDay: number,
    source: "check_in" | "recover",
  ): Promise<void> {
    await this.pointService.savePointGrantRequest(
      userKey,
      PointReason.ATTENDANCE,
    );
    this.logger.log(
      {
        event: "attendance.reward.granted",
        userKey,
        rewardedDay,
        source,
      },
      "출석 마일스톤 보상 적재",
    );
  }
}
