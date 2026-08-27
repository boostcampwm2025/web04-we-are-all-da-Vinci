import { EntityManager, LockMode } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
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
import { AttendanceRepository } from "./attendance.repository";
import { nextCycleDay, rewardedDayFor, tomorrowMaxPoint } from "./lib/cycle";

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly recoveryAdGroupId: string;

  constructor(
    private readonly em: EntityManager,
    private readonly pointService: PointService,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: AttendanceRepository,
    configService: ConfigService,
  ) {
    this.recoveryAdGroupId = configService.getOrThrow<string>(
      "ATTENDANCE_AD_GROUP_ID",
    );
  }

  // 오늘(KST) 출석하지 않은 사용자 전수 — 연속 출석 중단 알림 발송 대상.
  // last_checked_date < 오늘 시작이면 오늘 미체크인(어제·그저께·장기 휴면 포함).
  async findUncheckedInTodayUserKeys(): Promise<number[]> {
    const todayStart = getSeoulDayRange().start;
    return this.attendanceRepository.findUserKeysByLastCheckedBefore(
      todayStart,
    );
  }

  // KST 자정 기준 하루 시작 시각(ms). 저장값/오늘을 같은 기준으로 비교한다.
  private dayStartMs(date: Date): number {
    return getSeoulDayRange(date).start.getTime();
  }

  @Transactional()
  async checkIn(userKey: number): Promise<AttendanceCheckInResponse> {
    const todayStart = getSeoulDayRange().start;
    const today = todayStart.getTime();
    const yesterday = today - DAY_DURATION_MS;

    const attendance = await this.em.findOne(
      Attendance,
      { userKey },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );

    // 첫 출석
    if (!attendance) {
      this.em.create(Attendance, {
        userKey,
        cycleDay: 1,
        lastCheckedDate: todayStart,
        recoverableDay: null,
      });
      await this.em.flush();

      this.logCheckIn(userKey, "started", 1, null);
      return {
        status: "started",
        cycleDay: 1,
        recoverable: false,
        previousDay: null,
        rewardedDay: null,
      };
    }

    const lastDay = this.dayStartMs(attendance.lastCheckedDate);

    // 오늘 이미 출석 — 멱등 재호출(전이·지급 없음)
    if (lastDay === today) {
      this.logCheckIn(userKey, "already", attendance.cycleDay, null);
      return {
        status: "already",
        cycleDay: attendance.cycleDay,
        recoverable: attendance.recoverableDay != null,
        previousDay: attendance.recoverableDay ?? null,
        rewardedDay: null,
      };
    }

    // 어제에 이어 연속 출석
    if (lastDay === yesterday) {
      const newDay = nextCycleDay(attendance.cycleDay);
      attendance.cycleDay = newDay;
      attendance.recoverableDay = null;
      attendance.lastCheckedDate = todayStart;

      const milestone = rewardedDayFor(newDay);
      if (milestone != null) {
        this.pointService.enqueueGrant(userKey, PointReason.ATTENDANCE);
      }
      await this.em.flush();

      this.logCheckIn(userKey, "continued", newDay, milestone);
      return {
        status: "continued",
        cycleDay: newDay,
        recoverable: false,
        previousDay: null,
        rewardedDay: milestone,
      };
    }

    // 갭(어제 이전) — 끊김 리셋. 오늘은 1일차로 출석 처리하고 직전 위치를 복구 대상으로 보관.
    const previousDay = attendance.cycleDay;
    attendance.recoverableDay = previousDay;
    attendance.cycleDay = 1;
    attendance.lastCheckedDate = todayStart;
    await this.em.flush();

    this.logCheckIn(userKey, "reset_recoverable", 1, null);
    return {
      status: "reset_recoverable",
      cycleDay: 1,
      recoverable: true,
      previousDay,
      rewardedDay: null,
    };
  }

  private logCheckIn(
    userKey: number,
    status: string,
    cycleDay: number,
    rewardedDay: number | null,
  ) {
    this.logger.log(
      {
        event: "attendance.check_in.succeeded",
        userKey,
        status,
        cycleDay,
        rewardedDay,
      },
      "출석 체크 완료",
    );
  }

  @Transactional()
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

    const today = getSeoulDayRange().start.getTime();
    const attendance = await this.em.findOne(
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

    if (this.dayStartMs(attendance.lastCheckedDate) !== today) {
      this.logger.warn(
        {
          event: "attendance.recover.denied",
          userKey,
          reason: "recovery_window_expired",
        },
        "복구 기간이 지났어요",
      );
      throw new ForbiddenException("복구 기간이 지났어요.");
    }

    const restored = nextCycleDay(attendance.recoverableDay);
    attendance.cycleDay = restored;
    attendance.recoverableDay = null;

    this.em.create(AdView, {
      type: AdType.ATTENDANCE_RECOVERY,
      user: this.em.getReference(User, userKey),
    });

    const milestone = rewardedDayFor(restored);
    if (milestone != null) {
      this.pointService.enqueueGrant(userKey, PointReason.ATTENDANCE);
    }
    await this.em.flush();

    this.logger.log(
      {
        event: "attendance.recover.succeeded",
        userKey,
        cycleDay: restored,
        rewardedDay: milestone,
      },
      "연속 출석 복구 완료",
    );

    return { cycleDay: restored, rewardedDay: milestone };
  }

  // 복구를 포기하고 끊긴 채로 새로 시작한다. 이미 리셋된 cycleDay는 두고
  // 복구 대상(recoverableDay)만 비워 카드가 정상 상태로 돌아가게 한다.
  @Transactional()
  async declineRecovery(userKey: number): Promise<AttendanceStatusResponse> {
    const attendance = await this.em.findOne(
      Attendance,
      { userKey },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );

    if (attendance && attendance.recoverableDay != null) {
      attendance.recoverableDay = null;
      await this.em.flush();
    }

    this.logger.log(
      { event: "attendance.recover.declined", userKey },
      "연속 출석 복구 포기",
    );

    return this.getStatus(userKey);
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
    const recoverable = attendance.recoverableDay != null && checkedToday;

    return {
      cycleDay: attendance.cycleDay,
      checkedToday,
      recoverable,
      previousDay: recoverable ? attendance.recoverableDay : null,
      tomorrowMaxPoint: tomorrowMaxPoint(attendance.cycleDay),
    };
  }
}
