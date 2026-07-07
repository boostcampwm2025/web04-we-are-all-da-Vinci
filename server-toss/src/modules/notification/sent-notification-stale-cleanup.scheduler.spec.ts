import type { ConfigService } from "@nestjs/config";
import { SentNotificationStaleCleanupScheduler } from "./sent-notification-stale-cleanup.scheduler";
import type { NotificationService } from "./notification.service";

const buildScheduler = (opts?: {
  thresholdMinutesEnv?: string;
  affected?: number;
  serviceError?: Error;
}) => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "NOTIFICATION_STALE_THRESHOLD_MINUTES") {
        return opts?.thresholdMinutesEnv;
      }
      return undefined;
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const notificationService = {
    markStaleInFlightAsFailed: opts?.serviceError
      ? jest.fn().mockRejectedValue(opts.serviceError)
      : jest.fn().mockResolvedValue(opts?.affected ?? 0),
  } as unknown as jest.Mocked<NotificationService>;

  // run() 직접 호출이라 handleCleanup의 RequestContext.create는 타지 않음 → em 빈 mock.
  const scheduler = new SentNotificationStaleCleanupScheduler(
    {} as never,
    configService,
    notificationService,
  );

  return { scheduler, notificationService, configService };
};

describe("IN_FLIGHT 정리 스케줄러", () => {
  it("기본 임계는 60분이고 그보다 오래된 IN_FLIGHT만 정리해요", async () => {
    const { scheduler, notificationService } = buildScheduler({
      affected: 0,
    });

    const before = Date.now();
    await scheduler.run();
    const after = Date.now();

    expect(notificationService.markStaleInFlightAsFailed).toHaveBeenCalledTimes(
      1,
    );
    const staleBefore = (
      notificationService.markStaleInFlightAsFailed as jest.Mock
    ).mock.calls[0][0] as Date;
    // staleBefore는 now - 60분
    expect(staleBefore.getTime()).toBeGreaterThanOrEqual(
      before - 60 * 60 * 1000,
    );
    expect(staleBefore.getTime()).toBeLessThanOrEqual(after - 60 * 60 * 1000);
  });

  it("환경변수로 임계를 분 단위로 오버라이드할 수 있어요", async () => {
    const { scheduler, notificationService } = buildScheduler({
      thresholdMinutesEnv: "10",
      affected: 0,
    });

    const before = Date.now();
    await scheduler.run();

    const staleBefore = (
      notificationService.markStaleInFlightAsFailed as jest.Mock
    ).mock.calls[0][0] as Date;
    expect(staleBefore.getTime()).toBeGreaterThanOrEqual(
      before - 10 * 60 * 1000 - 100,
    );
  });

  it("잘못된 값은 무시하고 기본값(60분)을 사용해요", async () => {
    const { scheduler, notificationService } = buildScheduler({
      thresholdMinutesEnv: "abc",
      affected: 0,
    });

    const before = Date.now();
    await scheduler.run();

    const staleBefore = (
      notificationService.markStaleInFlightAsFailed as jest.Mock
    ).mock.calls[0][0] as Date;
    expect(staleBefore.getTime()).toBeGreaterThanOrEqual(
      before - 60 * 60 * 1000 - 100,
    );
  });

  it("affected가 0이면 정상 종료하고 throw 안 해요", async () => {
    const { scheduler } = buildScheduler({ affected: 0 });
    await expect(scheduler.run()).resolves.toBe(undefined);
  });

  it("affected가 있으면 repository 호출해 row 수만큼 FAILED로 변경돼요", async () => {
    const { scheduler, notificationService } = buildScheduler({
      affected: 7,
    });

    await scheduler.run();

    expect(notificationService.markStaleInFlightAsFailed).toHaveBeenCalledTimes(
      1,
    );
  });

  it("repository가 throw해도 cron 다음 차수 영향 없이 swallow해요", async () => {
    const { scheduler } = buildScheduler({
      serviceError: new Error("DB 장애"),
    });

    await expect(scheduler.run()).resolves.toBe(undefined);
  });
});
