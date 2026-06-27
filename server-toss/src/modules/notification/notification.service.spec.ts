import { UniqueConstraintViolationException } from "@mikro-orm/core";
import {
  TossApiError,
  TossTransportError,
} from "src/external/toss/common/toss.errors";
import {
  NOTIFICATION_TYPE,
  SENT_NOTIFICATION_STATUS,
} from "./notification.constants";
import type { NotificationSender } from "./port/notification-sender.interface";
import type { TossMessengerResponse } from "./schemas/toss-messenger.schema";
import { NotificationService } from "./notification.service";
import type { SentNotification } from "./sent-notification.entity";

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

const buildEm = () => {
  let idSeq = 0n;
  return {
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => {
      idSeq += 1n;
      return { id: idSeq, ...data } as unknown as SentNotification;
    }),
    flush: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
    nativeUpdate: jest.fn().mockResolvedValue(0),
  };
};

const buildService = () => {
  const em = buildEm();

  const notificationSender = {
    sendMessage: jest.fn(),
    sendBulkMessage: jest.fn(),
  } as unknown as jest.Mocked<NotificationSender>;

  const service = new NotificationService(em as never, notificationSender);

  return { service, em, notificationSender };
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
    const { service, em, notificationSender } = buildService();
    // UniqueConstraintViolationException을 시뮬레이션 — flush가 실패하면 reserve가 false 반환
    em.flush.mockRejectedValueOnce(
      new UniqueConstraintViolationException(new Error("duplicate")),
    );

    const result = await service.send(baseInput);

    expect(result).toEqual({ sent: false, reason: "already_sent" });
    expect(notificationSender.sendMessage).not.toHaveBeenCalled();
  });

  it("정상 발송 시 status를 DELIVERED로 바꿔요", async () => {
    const { service, em, notificationSender } = buildService();
    notificationSender.sendMessage.mockResolvedValueOnce(okResponse());

    const result = await service.send(baseInput);

    expect(result).toEqual({ sent: true });
    // reserve가 만든 entity의 status가 DELIVERED로 변경됨
    const createdEntity = em.create.mock.results[0].value as SentNotification;
    expect(createdEntity.status).toBe(SENT_NOTIFICATION_STATUS.DELIVERED);
  });

  it("일부 채널 도달 실패가 있어도 DELIVERED로 처리해요", async () => {
    const { service, em, notificationSender } = buildService();
    notificationSender.sendMessage.mockResolvedValueOnce(
      okResponse({
        failPush: [{ contentId: "x", reachFailReason: "PERMISSION_DENIED" }],
      }),
    );

    const result = await service.send(baseInput);

    expect(result).toEqual({ sent: true });
    const createdEntity = em.create.mock.results[0].value as SentNotification;
    expect(createdEntity.status).toBe(SENT_NOTIFICATION_STATUS.DELIVERED);
  });

  it("resultType FAIL이면 status를 FAILED로 바꿔요 (롤백 안 함)", async () => {
    const { service, em, notificationSender } = buildService();
    notificationSender.sendMessage.mockResolvedValueOnce(failResponse);

    const result = await service.send(baseInput);

    expect(result).toEqual({ sent: false, reason: "fail_response" });
    const createdEntity = em.create.mock.results[0].value as SentNotification;
    expect(createdEntity.status).toBe(SENT_NOTIFICATION_STATUS.FAILED);
  });

  it("4xx 에러는 재시도하지 않고 즉시 FAILED + throw해요", async () => {
    const { service, em, notificationSender } = buildService();
    const error = new TossApiError(400, "bad request");
    notificationSender.sendMessage.mockRejectedValueOnce(error);

    await expect(service.send(baseInput)).rejects.toBe(error);
    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(1);
    const createdEntity = em.create.mock.results[0].value as SentNotification;
    expect(createdEntity.status).toBe(SENT_NOTIFICATION_STATUS.FAILED);
  });

  it("transport timeout이면 재시도 후 성공 시 DELIVERED로 처리해요", async () => {
    jest.useFakeTimers();
    try {
      const { service, em, notificationSender } = buildService();

      notificationSender.sendMessage
        .mockRejectedValueOnce(new TossTransportError("타임아웃"))
        .mockResolvedValueOnce(okResponse());

      const promise = service.send(baseInput);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ sent: true });
      expect(notificationSender.sendMessage).toHaveBeenCalledTimes(2);
      const createdEntity = em.create.mock.results[0].value as SentNotification;
      expect(createdEntity.status).toBe(SENT_NOTIFICATION_STATUS.DELIVERED);
    } finally {
      jest.useRealTimers();
    }
  });

  it("transport 재시도 모두 실패하면 FAILED + throw해요", async () => {
    jest.useFakeTimers();
    try {
      const { service, em, notificationSender } = buildService();

      const error = new TossTransportError("타임아웃");
      notificationSender.sendMessage.mockRejectedValue(error);

      const promise = service.send(baseInput);
      // rejection을 미리 잡아 unhandled로 안 새도록.
      const rejectionAssertion = expect(promise).rejects.toBe(error);
      await jest.runAllTimersAsync();
      await rejectionAssertion;

      expect(notificationSender.sendMessage).toHaveBeenCalledTimes(3);
      const createdEntity = em.create.mock.results[0].value as SentNotification;
      expect(createdEntity.status).toBe(SENT_NOTIFICATION_STATUS.FAILED);
    } finally {
      jest.useRealTimers();
    }
  });

  it("5xx도 재시도 대상이에요", async () => {
    jest.useFakeTimers();
    try {
      const { service, notificationSender } = buildService();

      notificationSender.sendMessage
        .mockRejectedValueOnce(new TossApiError(503, "service unavailable"))
        .mockResolvedValueOnce(okResponse());

      const promise = service.send(baseInput);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ sent: true });
      expect(notificationSender.sendMessage).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("NotificationService.sendBulk", () => {
  it("50명 이상이면 대량 발송 API를 호출하고 status를 DELIVERED로 바꿔요", async () => {
    const { service, em, notificationSender } = buildService();
    notificationSender.sendBulkMessage.mockResolvedValueOnce(okResponse());

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
    expect(notificationSender.sendBulkMessage).toHaveBeenCalledWith({
      templateSetCode: "daily_prompt_v1",
      contextList: targets,
    });
    // 모든 entity의 status가 DELIVERED
    const entities = em.create.mock.results.map(
      (r) => r.value as SentNotification,
    );
    expect(entities).toHaveLength(50);
    for (const entity of entities) {
      expect(entity.status).toBe(SENT_NOTIFICATION_STATUS.DELIVERED);
    }
  });

  it("중복 제외 후 50명 미만이면 단건 fallback으로 보내고 각 row를 DELIVERED로 바꿔요", async () => {
    const { service, em, notificationSender } = buildService();
    // 두 번째 flush를 UniqueConstraintViolationException으로 실패 → reserve가 false 반환 → skip
    em.flush
      .mockResolvedValueOnce(undefined) // 첫 reserve 성공
      .mockRejectedValueOnce(
        new UniqueConstraintViolationException(new Error("dup")),
      ) // 두 번째 reserve 중복
      .mockResolvedValueOnce(undefined) // 세 번째 reserve 성공
      .mockResolvedValue(undefined); // 이후 updateStatus flush들
    notificationSender.sendMessage.mockResolvedValue(okResponse());

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
    expect(notificationSender.sendBulkMessage).not.toHaveBeenCalled();
    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(2);
  });

  it("대량 발송이 비즈니스 실패면 모든 row를 FAILED로 바꿔요", async () => {
    const { service, em, notificationSender } = buildService();
    notificationSender.sendBulkMessage.mockResolvedValueOnce(failResponse);

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
    const entities = em.create.mock.results.map(
      (r) => r.value as SentNotification,
    );
    for (const entity of entities) {
      expect(entity.status).toBe(SENT_NOTIFICATION_STATUS.FAILED);
    }
  });

  it("대량 transport error는 재시도 후 exhausted되면 FAILED로 마킹해요", async () => {
    jest.useFakeTimers();
    try {
      const { service, em, notificationSender } = buildService();
      notificationSender.sendBulkMessage.mockRejectedValue(
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
      expect(notificationSender.sendBulkMessage).toHaveBeenCalledTimes(3);
      const entities = em.create.mock.results.map(
        (r) => r.value as SentNotification,
      );
      for (const entity of entities) {
        expect(entity.status).toBe(SENT_NOTIFICATION_STATUS.FAILED);
      }
    } finally {
      jest.useRealTimers();
    }
  });
});
