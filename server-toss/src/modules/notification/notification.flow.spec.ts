import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/mysql";
import type { ConfigService } from "@nestjs/config";
import type { PromptService } from "../prompt/prompt.service";
import type { NotificationSender } from "./port/notification-sender.interface";
import type { TossMessengerResponse } from "./schemas/toss-messenger.schema";
import { DailyPromptNotificationScheduler } from "./daily-prompt-notification.scheduler";
import {
  NOTIFICATION_TYPE,
  SENT_NOTIFICATION_STATUS,
  type SentNotificationStatus,
} from "./notification.constants";
import { NotificationService } from "./notification.service";
import type { SentNotification } from "./sent-notification.entity";
import type { SentNotificationRepository } from "./sent-notification.repository";

const okResponse = (): TossMessengerResponse => ({
  resultType: "SUCCESS",
  result: {
    msgCount: 1,
    sentPushCount: 1,
    sentInboxCount: 0,
    sentSmsCount: 0,
    sentAlimtalkCount: 0,
    sentFriendtalkCount: 0,
    detail: {
      sentPush: [{ contentId: "toss:PUSH:ok" }],
      sentInbox: [],
      sentSms: [],
      sentAlimtalk: [],
      sentFriendtalk: [],
    },
    fail: {
      sentPush: [],
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

type StoredNotification = SentNotification & {
  userKey: number;
  type: string;
  referenceId: string;
  status: SentNotificationStatus;
};

const notificationKey = (input: {
  userKey: number;
  type: string;
  referenceId: string;
}) => `${input.userKey}:${input.type}:${input.referenceId}`;

class InMemoryNotificationStore {
  private sequence = 0n;
  readonly records = new Map<string, StoredNotification>();

  get size() {
    return this.records.size;
  }

  countByStatus(status: SentNotificationStatus): number {
    let count = 0;
    for (const record of this.records.values()) {
      if (record.status === status) count += 1;
    }
    return count;
  }

  createEntity(data: Record<string, unknown>): StoredNotification {
    return {
      id: (this.sequence += 1n),
      ...data,
      status: SENT_NOTIFICATION_STATUS.IN_FLIGHT,
    } as StoredNotification;
  }

  flush(entity: StoredNotification): void {
    const key = notificationKey(entity);
    if (this.records.has(key)) {
      throw new UniqueConstraintViolationException(new Error("duplicate"));
    }
    this.records.set(key, entity);
  }
}

const buildFlow = (opts: {
  userKeys: number[];
  responses?: TossMessengerResponse[];
}) => {
  const store = new InMemoryNotificationStore();
  let pendingEntity: StoredNotification | null = null;

  const em = {
    create: jest.fn((_ctor: unknown, data: Record<string, unknown>) => {
      pendingEntity = store.createEntity(data);
      return pendingEntity;
    }),
    flush: jest.fn(async () => {
      if (pendingEntity) {
        store.flush(pendingEntity);
        pendingEntity = null;
      }
    }),
    clear: jest.fn(),
    nativeUpdate: jest.fn().mockResolvedValue(0),
  } as unknown as EntityManager;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === "DAILY_PROMPT_NOTIFICATION_ENABLED") return "true";
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === "TOSS_TEMPLATE_DAILY_PROMPT") return "daily_prompt_v1";
      throw new Error(`unexpected key: ${key}`);
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const notificationSender = {
    sendMessage: jest
      .fn()
      .mockImplementation(async () => opts.responses?.shift() ?? okResponse()),
  } as unknown as jest.Mocked<NotificationSender>;

  const sentNotificationRepository = {
    findAgreedUserKeysWithNoDrawingIn: jest
      .fn()
      .mockResolvedValue(opts.userKeys),
  } as unknown as jest.Mocked<SentNotificationRepository>;

  const notificationService = new NotificationService(em, notificationSender);
  const promptService = {
    getPromptByDate: jest.fn().mockResolvedValue({ promptId: 1, strokes: [] }),
  } as unknown as jest.Mocked<PromptService>;
  const scheduler = new DailyPromptNotificationScheduler(
    {} as never,
    configService,
    notificationService,
    sentNotificationRepository,
    promptService,
  );

  return { scheduler, store, notificationSender };
};

describe("알림 로컬 검증 흐름", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-26T03:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("대상 조회부터 Toss payload와 발송 기록 멱등성까지 검증해요", async () => {
    const { scheduler, store, notificationSender } = buildFlow({
      userKeys: [101, 202],
    });

    await scheduler.run();
    await scheduler.run();

    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(2);
    expect(notificationSender.sendMessage).toHaveBeenNthCalledWith(1, {
      userKey: 101,
      templateSetCode: "daily_prompt_v1",
      context: {},
    });
    expect(notificationSender.sendMessage).toHaveBeenNthCalledWith(2, {
      userKey: 202,
      templateSetCode: "daily_prompt_v1",
      context: {},
    });
    expect(store.size).toBe(2);
    expect(store.countByStatus(SENT_NOTIFICATION_STATUS.DELIVERED)).toBe(2);
  });

  it("Toss 실패 응답은 row를 보존(status=FAILED)해서 다음 실행에서 UNIQUE로 차단해요", async () => {
    const { scheduler, store, notificationSender } = buildFlow({
      userKeys: [303],
      responses: [failResponse, okResponse()],
    });

    await scheduler.run();

    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(1);
    expect(store.countByStatus(SENT_NOTIFICATION_STATUS.FAILED)).toBe(1);

    await scheduler.run();

    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(1);
  });

  it("스케줄러가 KST 오늘 날짜를 daily_prompt referenceId로 사용해요", async () => {
    const { scheduler, store } = buildFlow({
      userKeys: [404],
    });

    await scheduler.run();

    const records = [...store.records.values()];
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userKey: 404,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      referenceId: "2026-05-26",
    });
  });
});
