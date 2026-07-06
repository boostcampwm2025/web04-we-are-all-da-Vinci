import { EntityManager } from "@mikro-orm/core";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { getSeoulDateKey, getSeoulDayRange } from "src/common/util/time.util";
import { AttendanceService } from "../attendance/attendance.service";
import { NotificationAgreement } from "./notification-agreement.entity";
import { NotificationAgreementRepository } from "./notification-agreement.repository";
import {
  BULK_MESSAGE_MIN_RECIPIENTS,
  NOTIFICATION_TYPE,
} from "./notification.constants";
import { NotificationService } from "./notification.service";

// 연속 출석 중단 알림 발송 시각(KST). 로컬 검증용으로 .env.local에서
// ATTENDANCE_STREAK_CRON 환경변수로 식을 오버라이드할 수 있다 (예: "* * * * *").
// 데코레이터는 클래스 로드 시점에 평가되므로 NestJS 부팅 전에 dotenv가
// 환경변수를 채우는 흐름을 신뢰한다.
const DEFAULT_ATTENDANCE_STREAK_CRON = "30 20 * * *"; // KST 20:30
const ATTENDANCE_STREAK_CRON =
  process.env.ATTENDANCE_STREAK_CRON ?? DEFAULT_ATTENDANCE_STREAK_CRON;

@Injectable()
export class AttendanceStreakNotificationScheduler {
  private readonly logger = new Logger(
    AttendanceStreakNotificationScheduler.name,
  );

  constructor(
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    @InjectRepository(NotificationAgreement)
    private readonly notificationAgreementRepository: NotificationAgreementRepository,
    private readonly attendanceService: AttendanceService,
  ) {}

  @CreateRequestContext(
    (self: AttendanceStreakNotificationScheduler) => self.em,
  )
  @Cron(ATTENDANCE_STREAK_CRON, { timeZone: "Asia/Seoul" })
  async handleAttendanceStreakBroadcast(): Promise<void> {
    await this.run();
  }

  /** 테스트에서 직접 호출하기 위한 진입점 */
  async run(): Promise<void> {
    if (
      this.configService.get<string>(
        "ATTENDANCE_STREAK_NOTIFICATION_ENABLED",
      ) !== "true"
    ) {
      this.logger.log(
        {
          event: "attendance_streak.scheduler.skipped",
          reason: "feature_disabled",
        },
        "연속 출석 중단 알림 발송이 비활성화되어 스킵해요.",
      );
      return;
    }

    const templateSetCode = this.configService.getOrThrow<string>(
      "TOSS_TEMPLATE_ATTENDANCE_STREAK",
    );
    const todayRange = getSeoulDayRange();
    const referenceId = getSeoulDateKey(todayRange.start);

    let userKeys: number[];
    try {
      userKeys = await this.attendanceService.findUncheckedInTodayUserKeys();
    } catch (err) {
      this.logger.error(
        {
          event: "attendance_streak.scheduler.failed",
          reason: "target_query",
          err,
          referenceId,
        },
        "발송 대상 조회에 실패했어요.",
      );
      return;
    }

    if (userKeys.length === 0) {
      this.logger.log(
        {
          event: "attendance_streak.scheduler.skipped",
          reason: "no_target",
          referenceId,
        },
        "오늘 미출석 사용자가 없어 발송 스킵해요.",
      );
      return;
    }

    let agreedUserKeys: number[];
    try {
      agreedUserKeys =
        await this.notificationAgreementRepository.findAgreedUserKeysAmong({
          userKeys,
          type: NOTIFICATION_TYPE.ATTENDANCE_STREAK,
          templateCode: templateSetCode,
        });
    } catch (err) {
      this.logger.error(
        {
          event: "attendance_streak.scheduler.failed",
          reason: "agreement_query",
          err,
          referenceId,
        },
        "동의자 조회에 실패했어요.",
      );
      return;
    }

    if (agreedUserKeys.length === 0) {
      this.logger.log(
        {
          event: "attendance_streak.scheduler.skipped",
          reason: "no_agreed",
          referenceId,
          total: userKeys.length,
        },
        "연속 출석 중단 알림 동의자가 없어 발송 스킵해요.",
      );
      return;
    }

    if (agreedUserKeys.length >= BULK_MESSAGE_MIN_RECIPIENTS) {
      try {
        const result = await this.notificationService.sendBulk({
          targets: agreedUserKeys.map((userKey) => ({ userKey, context: {} })),
          type: NOTIFICATION_TYPE.ATTENDANCE_STREAK,
          referenceId,
          templateSetCode,
        });

        this.logger.log(
          {
            event: "attendance_streak.scheduler.completed",
            mode: "bulk",
            referenceId,
            total: agreedUserKeys.length,
            ...result,
          },
          "연속 출석 중단 알림 대량 발송이 끝났어요.",
        );
      } catch (err) {
        this.logger.error(
          {
            event: "attendance_streak.scheduler.failed",
            reason: "bulk",
            referenceId,
            total: agreedUserKeys.length,
            err,
          },
          "연속 출석 중단 알림 대량 발송 준비에 실패했어요.",
        );
      }
      return;
    }

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const userKey of agreedUserKeys) {
      try {
        const result = await this.notificationService.send({
          targetUserKey: userKey,
          type: NOTIFICATION_TYPE.ATTENDANCE_STREAK,
          referenceId,
          templateSetCode,
          context: {},
        });
        if (result.sent) {
          sentCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch (err) {
        failedCount += 1;
        this.logger.error(
          {
            event: "attendance_streak.scheduler.failed",
            reason: "send",
            userKey,
            referenceId,
            err,
          },
          "사용자 발송에 실패해 다음 사용자로 넘어가요.",
        );
      }
    }

    this.logger.log(
      {
        event: "attendance_streak.scheduler.completed",
        mode: "single",
        referenceId,
        total: agreedUserKeys.length,
        sentCount,
        skippedCount,
        failedCount,
      },
      "연속 출석 중단 알림 발송이 끝났어요.",
    );
  }
}
