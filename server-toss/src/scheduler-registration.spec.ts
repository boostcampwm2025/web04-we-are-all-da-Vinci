import { CronExpression } from "@nestjs/schedule";
import { SchedulerType } from "@nestjs/schedule/dist/enums/scheduler-type.enum";
import { AttendanceStreakNotificationScheduler } from "./modules/notification/attendance-streak-notification.scheduler";
import { DailyPromptNotificationScheduler } from "./modules/notification/daily-prompt-notification.scheduler";
import { RankingChangedListener } from "./modules/notification/listeners/ranking-changed.listener";
import { SentNotificationStaleCleanupScheduler } from "./modules/notification/sent-notification-stale-cleanup.scheduler";
import { PointGrantPurgeScheduler } from "./modules/point/scheduler/point-grant-purge.scheduler";
import { PointGrantScheduler } from "./modules/point/scheduler/point-grant.scheduler";
import { RANKING_CHANGED_EVENT } from "./modules/ranking/events/ranking-changed.event";
import { RankingCleanupScheduler } from "./modules/ranking/ranking.cleanup.scheduler";

const SCHEDULER_TYPE_METADATA = "SCHEDULER_TYPE";
const CRON_OPTIONS_METADATA = "SCHEDULE_CRON_OPTIONS";
const EVENT_LISTENER_METADATA = "EVENT_LISTENER_METADATA";

describe("스케줄러와 이벤트 리스너 등록", () => {
  it.each([
    [
      "포인트 지급",
      PointGrantScheduler.prototype.processEligiblePoints,
      CronExpression.EVERY_SECOND,
    ],
    [
      "포인트 지급 요청 정리",
      PointGrantPurgeScheduler.prototype.purgeProcessedRequests,
      CronExpression.EVERY_DAY_AT_MIDNIGHT,
    ],
    [
      "랭킹 정리",
      RankingCleanupScheduler.prototype.handleRankingSnapshotCleanup,
      CronExpression.EVERY_DAY_AT_MIDNIGHT,
    ],
    [
      "일일 프롬프트 알림",
      DailyPromptNotificationScheduler.prototype.handleDailyPromptBroadcast,
      "0 20 * * *",
    ],
    [
      "연속 출석 중단 알림",
      AttendanceStreakNotificationScheduler.prototype
        .handleAttendanceStreakBroadcast,
      "30 20 * * *",
    ],
    [
      "오래된 알림 정리",
      SentNotificationStaleCleanupScheduler.prototype.handleCleanup,
      "0 * * * *",
    ],
  ])("%s 작업이 크론으로 등록된다", (_name, handler, cronTime) => {
    expect(Reflect.getMetadata(SCHEDULER_TYPE_METADATA, handler)).toBe(
      SchedulerType.CRON,
    );
    expect(Reflect.getMetadata(CRON_OPTIONS_METADATA, handler)).toEqual(
      expect.objectContaining({ cronTime, timeZone: "Asia/Seoul" }),
    );
  });

  it("포인트 지급 작업은 이전 실행이 끝날 때까지 중복 실행되지 않는다", () => {
    expect(
      Reflect.getMetadata(
        CRON_OPTIONS_METADATA,
        PointGrantScheduler.prototype.processEligiblePoints,
      ),
    ).toEqual(expect.objectContaining({ waitForCompletion: true }));
  });

  it("랭킹 변경 작업이 도메인 이벤트 리스너로 등록된다", () => {
    const metadata = Reflect.getMetadata(
      EVENT_LISTENER_METADATA,
      RankingChangedListener.prototype.handle,
    );

    expect(metadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: RANKING_CHANGED_EVENT }),
      ]),
    );
  });
});
