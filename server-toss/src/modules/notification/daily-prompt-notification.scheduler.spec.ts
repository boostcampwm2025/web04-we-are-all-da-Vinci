import type { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import type { PromptService } from "../prompt/prompt.service";
import { DailyPromptNotificationScheduler } from "./daily-prompt-notification.scheduler";
import { NOTIFICATION_TYPE } from "./notification.constants";
import type { NotificationService } from "./notification.service";
import type { SentNotificationRepository } from "./sent-notification.repository";

const buildScheduler = (opts: {
  enabled?: boolean;
  promptImpl?: jest.Mocked<PromptService>["getPromptByDate"];
  templateSetCode?: string;
  userKeys?: number[] | (() => Promise<number[]>);
  sendImpl?: jest.Mocked<NotificationService>["send"];
  sendBulkImpl?: jest.Mocked<NotificationService>["sendBulk"];
}) => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "DAILY_PROMPT_NOTIFICATION_ENABLED") {
        return opts.enabled === false ? "false" : "true";
      }
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === "TOSS_TEMPLATE_DAILY_PROMPT") {
        return opts.templateSetCode ?? "daily_prompt_v1";
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

  const sentNotificationRepository = {
    findAgreedUserKeysWithNoDrawingIn: jest
      .fn<
        Promise<number[]>,
        [
          {
            range: { start: Date; end: Date };
            type: string;
            referenceId: string;
            agreementTemplateCode: string;
          },
        ]
      >()
      .mockImplementation(async () => {
        if (typeof opts.userKeys === "function") return opts.userKeys();
        return opts.userKeys ?? [];
      }),
  } as unknown as jest.Mocked<SentNotificationRepository>;

  const promptService = {
    getPromptByDate:
      opts.promptImpl ??
      (jest.fn().mockResolvedValue({
        promptId: 1,
        strokes: [],
      }) as unknown as jest.Mocked<PromptService>["getPromptByDate"]),
  } as unknown as jest.Mocked<PromptService>;

  // run()을 직접 호출하는 테스트라 handleDailyPromptBroadcast의 RequestContext.create는
  // 타지 않는다 → em은 사용되지 않으므로 빈 mock으로 충분하다.
  const scheduler = new DailyPromptNotificationScheduler(
    {} as never,
    configService,
    notificationService,
    sentNotificationRepository,
    promptService,
  );

  return {
    scheduler,
    configService,
    notificationService,
    sentNotificationRepository,
    promptService,
  };
};

describe("DailyPromptNotificationScheduler.run", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // UTC 2026-05-26 03:00 = KST 2026-05-26 12:00. referenceId는 "2026-05-26"이어야 한다.
    jest.setSystemTime(new Date("2026-05-26T03:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("발송 대상이 없으면 토스 호출이 일어나지 않는다", async () => {
    const { scheduler, notificationService } = buildScheduler({ userKeys: [] });

    await scheduler.run();

    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("env 플래그가 꺼져 있으면 발송 대상 조회도 하지 않는다", async () => {
    const { scheduler, notificationService, sentNotificationRepository } =
      buildScheduler({ enabled: false, userKeys: [1] });

    await scheduler.run();

    expect(
      sentNotificationRepository.findAgreedUserKeysWithNoDrawingIn,
    ).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("오늘 프롬프트가 없으면 발송하지 않는다", async () => {
    const { scheduler, notificationService, sentNotificationRepository } =
      buildScheduler({
        userKeys: [1],
        promptImpl: jest
          .fn()
          .mockRejectedValue(new NotFoundException("PROMPT_NOT_FOUND")),
      });

    await scheduler.run();

    expect(
      sentNotificationRepository.findAgreedUserKeysWithNoDrawingIn,
    ).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("발송 대상 전원에게 KST 오늘 날짜를 referenceId로 전달한다", async () => {
    const { scheduler, notificationService, sentNotificationRepository } =
      buildScheduler({
        userKeys: [101, 202, 303],
      });

    await scheduler.run();

    expect(
      sentNotificationRepository.findAgreedUserKeysWithNoDrawingIn,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATION_TYPE.DAILY_PROMPT,
        referenceId: "2026-05-26",
        agreementTemplateCode: "daily_prompt_v1",
      }),
    );
    expect(notificationService.send).toHaveBeenCalledTimes(3);
    expect(notificationService.send).toHaveBeenNthCalledWith(1, {
      targetUserKey: 101,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      referenceId: "2026-05-26",
      templateSetCode: "daily_prompt_v1",
      context: {},
    });
    expect(notificationService.send).toHaveBeenNthCalledWith(2, {
      targetUserKey: 202,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      referenceId: "2026-05-26",
      templateSetCode: "daily_prompt_v1",
      context: {},
    });
    expect(notificationService.send).toHaveBeenNthCalledWith(3, {
      targetUserKey: 303,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      referenceId: "2026-05-26",
      templateSetCode: "daily_prompt_v1",
      context: {},
    });
  });

  it("대상이 50명 이상이면 대량 발송으로 위임한다", async () => {
    const userKeys = Array.from({ length: 50 }, (_, index) => index + 1);
    const { scheduler, notificationService } = buildScheduler({ userKeys });

    await scheduler.run();

    expect(notificationService.send).not.toHaveBeenCalled();
    expect(notificationService.sendBulk).toHaveBeenCalledWith({
      targets: userKeys.map((userKey) => ({ userKey, context: {} })),
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      referenceId: "2026-05-26",
      templateSetCode: "daily_prompt_v1",
    });
  });

  it("한 사용자 발송이 throw해도 다른 사용자에게 계속 시도한다", async () => {
    const sendImpl = jest
      .fn()
      .mockResolvedValueOnce({ sent: true })
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ sent: true });

    const { scheduler, notificationService } = buildScheduler({
      userKeys: [1, 2, 3],
      sendImpl: sendImpl as unknown as jest.Mocked<NotificationService>["send"],
    });

    await scheduler.run();

    expect(notificationService.send).toHaveBeenCalledTimes(3);
  });

  it("대상 조회가 throw하면 토스 호출이 일어나지 않는다", async () => {
    const { scheduler, notificationService } = buildScheduler({
      userKeys: () => Promise.reject(new Error("db down")),
    });

    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("UTC 자정 KST 새벽 케이스에서도 KST 날짜를 referenceId로 쓴다", async () => {
    // UTC 2026-05-25 15:30 = KST 2026-05-26 00:30. referenceId는 "2026-05-26"이어야 한다.
    jest.setSystemTime(new Date("2026-05-25T15:30:00.000Z"));

    const { scheduler, notificationService } = buildScheduler({
      userKeys: [1],
    });

    await scheduler.run();

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ referenceId: "2026-05-26" }),
    );
  });
});
