import { EntityManager } from "@mikro-orm/core";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { NotificationService } from "./notification.service";

// 매 시간 정각(KST). 환경변수 NOTIFICATION_STALE_CLEANUP_CRON으로 오버라이드 가능.
const STALE_CLEANUP_CRON =
  process.env.NOTIFICATION_STALE_CLEANUP_CRON ?? "0 * * * *";

const DEFAULT_THRESHOLD_MINUTES = 60;

// sent_notifications.status=IN_FLIGHT 잔존 row 자동 정리.
// 서버 크래시·DB 장애·외부 API 무응답으로 IN_FLIGHT가 굳어있으면 UNIQUE 제약 때문에
// 다음 cron의 재발송도 안 됨 → 사용자가 영영 알림 못 받음. 일정 임계 이상 지나면
// FAILED로 강제 마킹해서 운영자가 모니터링·재처리할 수 있게 한다.
@Injectable()
export class SentNotificationStaleCleanupScheduler {
  private readonly logger = new Logger(
    SentNotificationStaleCleanupScheduler.name,
  );

  constructor(
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  @CreateRequestContext(
    (self: SentNotificationStaleCleanupScheduler) => self.em,
  )
  @Cron(STALE_CLEANUP_CRON, { timeZone: "Asia/Seoul" })
  async handleCleanup(): Promise<void> {
    await this.run();
  }

  /** 테스트에서 직접 호출하기 위한 진입점 */
  async run(): Promise<void> {
    const thresholdMinutes = this.resolveThresholdMinutes();
    const staleBefore = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    try {
      const affected =
        await this.notificationService.markStaleInFlightAsFailed(staleBefore);

      if (affected > 0) {
        // 운영 모니터링 시그널 — warn 레벨로 가시화.
        this.logger.warn(
          {
            event: "notification.stale_cleanup.completed",
            affected,
            thresholdMinutes,
            staleBefore: staleBefore.toISOString(),
          },
          "오래된 IN_FLIGHT 알림을 FAILED로 정리했어요.",
        );
      } else {
        this.logger.debug(
          {
            event: "notification.stale_cleanup.skipped",
            reason: "no_stale",
            thresholdMinutes,
          },
          "정리할 IN_FLIGHT 잔존 row가 없어요.",
        );
      }
    } catch (err) {
      this.logger.error(
        {
          event: "notification.stale_cleanup.failed",
          thresholdMinutes,
          err,
        },
        "IN_FLIGHT 잔존 row 정리 중 예외가 발생했어요.",
      );
    }
  }

  private resolveThresholdMinutes(): number {
    const raw = this.configService.get<string>(
      "NOTIFICATION_STALE_THRESHOLD_MINUTES",
    );
    if (raw === undefined || raw === "") return DEFAULT_THRESHOLD_MINUTES;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_THRESHOLD_MINUTES;
    }
    return parsed;
  }
}
