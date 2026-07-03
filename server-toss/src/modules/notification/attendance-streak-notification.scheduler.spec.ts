import type { ConfigService } from "@nestjs/config";
import type { AttendanceService } from "../attendance/attendance.service";
import { AttendanceStreakNotificationScheduler } from "./attendance-streak-notification.scheduler";
import type { NotificationAgreementRepository } from "./notification-agreement.repository";
import { NOTIFICATION_TYPE } from "./notification.constants";
import type { NotificationService } from "./notification.service";

const buildScheduler = (opts: {
  enabled?: boolean;
  templateSetCode?: string;
  targetUserKeys?: number[] | (() => Promise<number[]>);
  agreedUserKeys?: number[] | (() => Promise<number[]>);
  sendImpl?: jest.Mocked<NotificationService>["send"];
  sendBulkImpl?: jest.Mocked<NotificationService>["sendBulk"];
}) => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "ATTENDANCE_STREAK_NOTIFICATION_ENABLED") {
        return opts.enabled === false ? "false" : "true";
      }
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === "TOSS_TEMPLATE_ATTENDANCE_STREAK") {
        return opts.templateSetCode ?? "attendance_streak_v1";
      }
      throw new Error(`unexpected key: ${key}`);
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const notificationService = {
    send:
      opts.sendImpl ??
      (jest.fn().mockResolvedValue({
        sent: true,
      }) as unknown as jest.Mocked<NotificationService>["send"]),
    sendBulk:
      opts.sendBulkImpl ??
      (jest.fn().mockResolvedValue({
        sentCount: 0,
        skippedCount: 0,
        failedCount: 0,
        partialFailCount: 0,
        bulkRequestCount: 0,
        singleFallbackCount: 0,
      }) as unknown as jest.Mocked<NotificationService>["sendBulk"]),
  } as unknown as jest.Mocked<NotificationService>;

  const notificationAgreementRepository = {
    findAgreedUserKeysAmong: jest.fn().mockImplementation(async () => {
      if (typeof opts.agreedUserKeys === "function")
        return opts.agreedUserKeys();
      return opts.agreedUserKeys ?? [];
    }),
  } as unknown as jest.Mocked<NotificationAgreementRepository>;

  const attendanceService = {
    findUncheckedInTodayUserKeys: jest.fn().mockImplementation(async () => {
      if (typeof opts.targetUserKeys === "function")
        return opts.targetUserKeys();
      return opts.targetUserKeys ?? [];
    }),
  } as unknown as jest.Mocked<AttendanceService>;

  // run()을 직접 호출하는 테스트라 handleAttendanceStreakBroadcast의
  // RequestContext.create는 타지 않는다 → em은 빈 mock으로 충분하다.
  const scheduler = new AttendanceStreakNotificationScheduler(
    {} as never,
    configService,
    notificationService,
    notificationAgreementRepository,
    attendanceService,
  );

  return {
    scheduler,
    configService,
    notificationService,
    notificationAgreementRepository,
    attendanceService,
  };
};

describe("연속 출석 중단 알림 스케줄러", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // UTC 2026-05-26 03:00 = KST 2026-05-26 12:00. referenceId는 "2026-05-26"이어야 한다.
    jest.setSystemTime(new Date("2026-05-26T03:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("기능 플래그가 꺼져 있으면 대상 조회조차 하지 않는다", async () => {
    const { scheduler, attendanceService, notificationService } =
      buildScheduler({ enabled: false, targetUserKeys: [1] });

    await scheduler.run();

    expect(
      attendanceService.findUncheckedInTodayUserKeys,
    ).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("오늘 미출석 대상이 없으면 동의 조회·발송을 하지 않는다", async () => {
    const { scheduler, notificationAgreementRepository, notificationService } =
      buildScheduler({ targetUserKeys: [] });

    await scheduler.run();

    expect(
      notificationAgreementRepository.findAgreedUserKeysAmong,
    ).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("동의자가 없으면 발송하지 않는다", async () => {
    const { scheduler, notificationService } = buildScheduler({
      targetUserKeys: [101, 202],
      agreedUserKeys: [],
    });

    await scheduler.run();

    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("동의자에게만 KST 오늘 날짜를 referenceId로 발송한다", async () => {
    const { scheduler, notificationAgreementRepository, notificationService } =
      buildScheduler({
        targetUserKeys: [101, 202, 303],
        agreedUserKeys: [101, 303],
      });

    await scheduler.run();

    expect(
      notificationAgreementRepository.findAgreedUserKeysAmong,
    ).toHaveBeenCalledWith({
      userKeys: [101, 202, 303],
      type: NOTIFICATION_TYPE.ATTENDANCE_STREAK,
      templateCode: "attendance_streak_v1",
    });
    expect(notificationService.send).toHaveBeenCalledTimes(2);
    expect(notificationService.send).toHaveBeenNthCalledWith(1, {
      targetUserKey: 101,
      type: NOTIFICATION_TYPE.ATTENDANCE_STREAK,
      referenceId: "2026-05-26",
      templateSetCode: "attendance_streak_v1",
      context: {},
    });
    expect(notificationService.send).toHaveBeenNthCalledWith(2, {
      targetUserKey: 303,
      type: NOTIFICATION_TYPE.ATTENDANCE_STREAK,
      referenceId: "2026-05-26",
      templateSetCode: "attendance_streak_v1",
      context: {},
    });
  });

  it("동의자가 50명 이상이면 대량 발송으로 위임한다", async () => {
    const agreedUserKeys = Array.from({ length: 50 }, (_, index) => index + 1);
    const { scheduler, notificationService } = buildScheduler({
      targetUserKeys: agreedUserKeys,
      agreedUserKeys,
    });

    await scheduler.run();

    expect(notificationService.send).not.toHaveBeenCalled();
    expect(notificationService.sendBulk).toHaveBeenCalledWith({
      targets: agreedUserKeys.map((userKey) => ({ userKey, context: {} })),
      type: NOTIFICATION_TYPE.ATTENDANCE_STREAK,
      referenceId: "2026-05-26",
      templateSetCode: "attendance_streak_v1",
    });
  });

  it("한 사용자 발송이 throw해도 다른 사용자에게 계속 시도한다", async () => {
    const sendImpl = jest
      .fn()
      .mockResolvedValueOnce({ sent: true })
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ sent: true });

    const { scheduler, notificationService } = buildScheduler({
      targetUserKeys: [1, 2, 3],
      agreedUserKeys: [1, 2, 3],
      sendImpl: sendImpl as unknown as jest.Mocked<NotificationService>["send"],
    });

    await scheduler.run();

    expect(notificationService.send).toHaveBeenCalledTimes(3);
  });

  it("대상 조회가 throw하면 발송이 일어나지 않는다", async () => {
    const { scheduler, notificationService } = buildScheduler({
      targetUserKeys: () => Promise.reject(new Error("db down")),
    });

    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("동의자 조회가 throw하면 발송이 일어나지 않는다", async () => {
    const { scheduler, notificationService } = buildScheduler({
      targetUserKeys: [101],
      agreedUserKeys: () => Promise.reject(new Error("db down")),
    });

    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("UTC 자정 KST 새벽 케이스에서도 KST 날짜를 referenceId로 쓴다", async () => {
    // UTC 2026-05-25 15:30 = KST 2026-05-26 00:30. referenceId는 "2026-05-26"이어야 한다.
    jest.setSystemTime(new Date("2026-05-25T15:30:00.000Z"));

    const { scheduler, notificationService } = buildScheduler({
      targetUserKeys: [1],
      agreedUserKeys: [1],
    });

    await scheduler.run();

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ referenceId: "2026-05-26" }),
    );
  });
});
