import {
  TossApiError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import type { TossMessengerResponse } from "src/modules/auth/schemas/toss-messenger.schema";
import type { TossApiClient } from "src/modules/auth/toss-api.client";
import {
  NOTIFICATION_TYPE,
  SENT_NOTIFICATION_STATUS,
} from "./notification.constants";
import { NotificationService } from "./notification.service";
import type { SentNotification } from "./sent-notification.entity";
import type { SentNotificationRepository } from "./sent-notification.repository";

const okResponse = (overrides?: {
  failPush?: { contentId: string; reachFailReason: string }[];
}): TossMessengerResponse => ({
  resultType: "SUCCESS",
  result: {
    msgCount: 1,
    sentPushCount: 1,
    sentInboxCount: 0,
    sentSmsCount: 0,
    sentAlimtalkCount: 0,
    sentFriendtalkCount: 0,
    detail: {
      sentPush: [{ contentId: "ok" }],
      sentInbox: [],
      sentSms: [],
      sentAlimtalk: [],
      sentFriendtalk: [],
    },
    fail: {
      sentPush: overrides?.failPush ?? [],
      sentInbox: [],
      sentSms: [],
      sentAlimtalk: [],
      sentFriendtalk: [],
    },
  },
});

const failResponse: TossMessengerResponse = {
  resultType: "FAIL",
  error: { errorCode: "TEMPLATE_NOT_FOUND", reason: "템플릿이 없어요" },
};

const buildService = () => {
  const sentNotificationRepository = {
    tryInsert: jest.fn(),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    updateStatusMany: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    getEntityManager: jest.fn().mockReturnValue({ clear: jest.fn() }),
  } as unknown as jest.Mocked<SentNotificationRepository>;

  const tossApiClient = {
    sendMessage: jest.fn(),
    sendBulkMessage: jest.fn(),
  } as unknown as jest.Mocked<TossApiClient>;

  const service = new NotificationService(
    sentNotificationRepository,
    tossApiClient,
  );

  return { service, sentNotificationRepository, tossApiClient };
};

const baseInput = {
  targetUserKey: 12345,
  type: NOTIFICATION_TYPE.DAILY_PROMPT,
  referenceId: "2026-05-26",
  templateSetCode: "daily_prompt_v1",
  context: { date: "2026-05-26" },
};

describe("NotificationService.send", () => {
  it("이미 발송된 알림이면 토스 호출 없이 already_sent를 반환해요", async () => {
    const { service, sentNotificationRepository, tossApiClient } =
      buildService();
    sentNotificationRepository.tryInsert.mockResolvedValueOnce(false);

    const result = await service.send(baseInput);

    expect(result).toEqual({ sent: false, reason: "already_sent" });
    expect(tossApiClient.sendMessage).not.toHaveBeenCalled();
    expect(sentNotificationRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("정상 발송 시 status를 DELIVERED로 바꿔요", async () => {
    const { service, sentNotificationRepository, tossApiClient } =
      buildService();
    const record = { id: 1n } as SentNotification;
    sentNotificationRepository.tryInsert.mockResolvedValueOnce(record);
    tossApiClient.sendMessage.mockResolvedValueOnce(okResponse());

    const result = await service.send(baseInput);

    expect(result).toEqual({ sent: true });
    expect(sentNotificationRepository.updateStatus).toHaveBeenCalledWith(
      record,
      SENT_NOTIFICATION_STATUS.DELIVERED,
    );
    expect(sentNotificationRepository.deleteOne).not.toHaveBeenCalled();
  });

  it("일부 채널 도달 실패가 있어도 DELIVERED로 처리해요", async () => {
    const { service, sentNotificationRepository, tossApiClient } =
      buildService();
    const record = { id: 1n } as SentNotification;
    sentNotificationRepository.tryInsert.mockResolvedValueOnce(record);
    tossApiClient.sendMessage.mockResolvedValueOnce(
      okResponse({
        failPush: [{ contentId: "x", reachFailReason: "PERMISSION_DENIED" }],
      }),
    );

    const result = await service.send(baseInput);

    expect(result).toEqual({ sent: true });
    expect(sentNotificationRepository.updateStatus).toHaveBeenCalledWith(
      record,
      SENT_NOTIFICATION_STATUS.DELIVERED,
    );
  });

  it("resultType FAIL이면 status를 FAILED로 바꿔요 (롤백 안 함)", async () => {
    const { service, sentNotificationRepository, tossApiClient } =
      buildService();
    const record = { id: 1n } as SentNotification;
    sentNotificationRepository.tryInsert.mockResolvedValueOnce(record);
    tossApiClient.sendMessage.mockResolvedValueOnce(failResponse);

    const result = await service.send(baseInput);

    expect(result).toEqual({ sent: false, reason: "fail_response" });
    expect(sentNotificationRepository.updateStatus).toHaveBeenCalledWith(
      record,
      SENT_NOTIFICATION_STATUS.FAILED,
    );
    expect(sentNotificationRepository.deleteOne).not.toHaveBeenCalled();
  });

  it("4xx 에러는 재시도하지 않고 즉시 FAILED + throw해요", async () => {
    const { service, sentNotificationRepository, tossApiClient } =
      buildService();
    const record = { id: 1n } as SentNotification;
    sentNotificationRepository.tryInsert.mockResolvedValueOnce(record);
    const error = new TossApiError(400, "bad request");
    tossApiClient.sendMessage.mockRejectedValueOnce(error);

    await expect(service.send(baseInput)).rejects.toBe(error);
    expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(sentNotificationRepository.updateStatus).toHaveBeenCalledWith(
      record,
      SENT_NOTIFICATION_STATUS.FAILED,
    );
  });

  it("transport timeout이면 재시도 후 성공 시 DELIVERED로 처리해요", async () => {
    jest.useFakeTimers();
    try {
      const { service, sentNotificationRepository, tossApiClient } =
        buildService();
      const record = { id: 1n } as SentNotification;
      sentNotificationRepository.tryInsert.mockResolvedValueOnce(record);

      tossApiClient.sendMessage
        .mockRejectedValueOnce(new TossTransportError("타임아웃"))
        .mockResolvedValueOnce(okResponse());

      const promise = service.send(baseInput);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ sent: true });
      expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(2);
      expect(sentNotificationRepository.updateStatus).toHaveBeenCalledWith(
        record,
        SENT_NOTIFICATION_STATUS.DELIVERED,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("transport 재시도 모두 실패하면 FAILED + throw해요", async () => {
    jest.useFakeTimers();
    try {
      const { service, sentNotificationRepository, tossApiClient } =
        buildService();
      const record = { id: 1n } as SentNotification;
      sentNotificationRepository.tryInsert.mockResolvedValueOnce(record);

      const error = new TossTransportError("타임아웃");
      tossApiClient.sendMessage.mockRejectedValue(error);

      const promise = service.send(baseInput);
      // rejection을 미리 잡아 unhandled로 안 새도록.
      const rejectionAssertion = expect(promise).rejects.toBe(error);
      await jest.runAllTimersAsync();
      await rejectionAssertion;

      expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(3);
      expect(sentNotificationRepository.updateStatus).toHaveBeenCalledWith(
        record,
        SENT_NOTIFICATION_STATUS.FAILED,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("5xx도 재시도 대상이에요", async () => {
    jest.useFakeTimers();
    try {
      const { service, sentNotificationRepository, tossApiClient } =
        buildService();
      const record = { id: 1n } as SentNotification;
      sentNotificationRepository.tryInsert.mockResolvedValueOnce(record);

      tossApiClient.sendMessage
        .mockRejectedValueOnce(new TossApiError(503, "service unavailable"))
        .mockResolvedValueOnce(okResponse());

      const promise = service.send(baseInput);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ sent: true });
      expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("NotificationService.sendBulk", () => {
  it("50명 이상이면 대량 발송 API를 호출하고 status를 DELIVERED로 바꿔요", async () => {
    const { service, sentNotificationRepository, tossApiClient } =
      buildService();
    let id = 0n;
    sentNotificationRepository.tryInsert.mockImplementation(async () => {
      id += 1n;
      return { id } as SentNotification;
    });
    tossApiClient.sendBulkMessage.mockResolvedValueOnce(okResponse());

    const targets = Array.from({ length: 50 }, (_, index) => ({
      userKey: index + 1,
      context: {},
    }));

    const result = await service.sendBulk({
      targets,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      referenceId: "2026-05-26",
      templateSetCode: "daily_prompt_v1",
    });

    expect(result).toMatchObject({
      sentCount: 50,
      skippedCount: 0,
      failedCount: 0,
      bulkRequestCount: 1,
      singleFallbackCount: 0,
    });
    expect(tossApiClient.sendBulkMessage).toHaveBeenCalledWith({
      templateSetCode: "daily_prompt_v1",
      contextList: targets,
    });
    expect(sentNotificationRepository.updateStatusMany).toHaveBeenCalledWith(
      expect.any(Array),
      SENT_NOTIFICATION_STATUS.DELIVERED,
    );
    expect(sentNotificationRepository.deleteMany).not.toHaveBeenCalled();
  });

  it("중복 제외 후 50명 미만이면 단건 fallback으로 보내고 각 row를 DELIVERED로 바꿔요", async () => {
    const { service, sentNotificationRepository, tossApiClient } =
      buildService();
    sentNotificationRepository.tryInsert
      .mockResolvedValueOnce({ id: 1n } as SentNotification)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({ id: 2n } as SentNotification);
    tossApiClient.sendMessage.mockResolvedValue(okResponse());

    const result = await service.sendBulk({
      targets: [
        { userKey: 101, context: {} },
        { userKey: 202, context: {} },
        { userKey: 303, context: { date: "2026-05-26" } },
      ],
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      referenceId: "2026-05-26",
      templateSetCode: "daily_prompt_v1",
    });

    expect(result).toMatchObject({
      sentCount: 2,
      skippedCount: 1,
      failedCount: 0,
      bulkRequestCount: 0,
      singleFallbackCount: 2,
    });
    expect(tossApiClient.sendBulkMessage).not.toHaveBeenCalled();
    expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(2);
    expect(sentNotificationRepository.updateStatus).toHaveBeenCalledTimes(2);
  });

  it("대량 발송이 비즈니스 실패면 모든 row를 FAILED로 바꿔요", async () => {
    const { service, sentNotificationRepository, tossApiClient } =
      buildService();
    let id = 0n;
    sentNotificationRepository.tryInsert.mockImplementation(async () => {
      id += 1n;
      return { id } as SentNotification;
    });
    tossApiClient.sendBulkMessage.mockResolvedValueOnce(failResponse);

    const result = await service.sendBulk({
      targets: Array.from({ length: 50 }, (_, index) => ({
        userKey: index + 1,
        context: {},
      })),
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      referenceId: "2026-05-26",
      templateSetCode: "daily_prompt_v1",
    });

    expect(result).toMatchObject({
      sentCount: 0,
      skippedCount: 0,
      failedCount: 50,
      bulkRequestCount: 1,
    });
    expect(sentNotificationRepository.updateStatusMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1n }),
        expect.objectContaining({ id: 50n }),
      ]),
      SENT_NOTIFICATION_STATUS.FAILED,
    );
    expect(sentNotificationRepository.deleteMany).not.toHaveBeenCalled();
  });

  it("대량 transport error는 재시도 후 exhausted되면 FAILED로 마킹해요", async () => {
    jest.useFakeTimers();
    try {
      const { service, sentNotificationRepository, tossApiClient } =
        buildService();
      let id = 0n;
      sentNotificationRepository.tryInsert.mockImplementation(async () => {
        id += 1n;
        return { id } as SentNotification;
      });
      tossApiClient.sendBulkMessage.mockRejectedValue(
        new TossTransportError("타임아웃"),
      );

      const promise = service.sendBulk({
        targets: Array.from({ length: 50 }, (_, index) => ({
          userKey: index + 1,
          context: {},
        })),
        type: NOTIFICATION_TYPE.DAILY_PROMPT,
        referenceId: "2026-05-26",
        templateSetCode: "daily_prompt_v1",
      });
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.failedCount).toBe(50);
      expect(tossApiClient.sendBulkMessage).toHaveBeenCalledTimes(3);
      expect(sentNotificationRepository.updateStatusMany).toHaveBeenCalledWith(
        expect.any(Array),
        SENT_NOTIFICATION_STATUS.FAILED,
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
