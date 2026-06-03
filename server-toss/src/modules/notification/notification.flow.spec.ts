import type { ConfigService } from "@nestjs/config";
import type { PromptService } from "../prompt/prompt.service";
import type { TossMessengerResponse } from "src/modules/auth/schemas/toss-messenger.schema";
import type { TossApiClient } from "src/modules/auth/toss-api.client";
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

class InMemorySentNotificationRepository {
  private sequence = 0n;
  private readonly records = new Map<string, StoredNotification>();

  constructor(private readonly userKeys: number[]) {}

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

  async findAgreedUserKeysWithNoDrawingIn(): Promise<number[]> {
    return this.userKeys;
  }

  async tryInsert(input: {
    userKey: number;
    type: string;
    referenceId: string;
    sentAt: Date;
  }): Promise<SentNotification | false> {
    const key = notificationKey(input);
    if (this.records.has(key)) return false;

    const record = {
      id: (this.sequence += 1n),
      userKey: input.userKey,
      type: input.type,
      referenceId: input.referenceId,
      sentAt: input.sentAt,
      createdAt: input.sentAt,
      updatedAt: input.sentAt,
      status: SENT_NOTIFICATION_STATUS.IN_FLIGHT,
    } as StoredNotification;

    this.records.set(key, record);
    return record;
  }

  async updateStatus(
    entity: SentNotification,
    status: SentNotificationStatus,
  ): Promise<void> {
    const record = entity as StoredNotification;
    record.status = status;
  }

  async updateStatusMany(
    entities: SentNotification[],
    status: SentNotificationStatus,
  ): Promise<void> {
    for (const entity of entities) {
      const record = entity as StoredNotification;
      record.status = status;
    }
  }

  async deleteOne(entity: SentNotification): Promise<void> {
    const record = entity as StoredNotification;
    this.records.delete(notificationKey(record));
  }
}

const buildFlow = (opts: {
  userKeys: number[];
  responses?: TossMessengerResponse[];
}) => {
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

  const tossApiClient = {
    sendMessage: jest
      .fn()
      .mockImplementation(async () => opts.responses?.shift() ?? okResponse()),
  } as unknown as jest.Mocked<TossApiClient>;

  const sentNotificationRepository = new InMemorySentNotificationRepository(
    opts.userKeys,
  );

  const counterMock = () => ({
    labels: jest.fn().mockReturnValue({ inc: jest.fn() }),
  });
  const histogramMock = () => ({
    labels: jest.fn().mockReturnValue({ observe: jest.fn() }),
  });

  const notificationService = new NotificationService(
    sentNotificationRepository as unknown as SentNotificationRepository,
    tossApiClient,
    counterMock() as never,
    histogramMock() as never,
    counterMock() as never,
  );
  const promptService = {
    getPromptByDate: jest.fn().mockResolvedValue({ promptId: 1, strokes: [] }),
  } as unknown as jest.Mocked<PromptService>;
  const scheduler = new DailyPromptNotificationScheduler(
    {} as never,
    configService,
    notificationService,
    sentNotificationRepository as unknown as SentNotificationRepository,
    promptService,
  );

  return { scheduler, sentNotificationRepository, tossApiClient };
};

describe("notification local verification flow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-26T03:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("대상 조회부터 Toss payload와 발송 기록 멱등성까지 검증해요", async () => {
    const { scheduler, sentNotificationRepository, tossApiClient } = buildFlow({
      userKeys: [101, 202],
    });

    await scheduler.run();
    await scheduler.run();

    // 두 사용자 각각 1번 호출. 두 번째 run은 UNIQUE 차단으로 skip.
    expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(2);
    expect(tossApiClient.sendMessage).toHaveBeenNthCalledWith(1, {
      userKey: 101,
      templateSetCode: "daily_prompt_v1",
      context: {},
    });
    expect(tossApiClient.sendMessage).toHaveBeenNthCalledWith(2, {
      userKey: 202,
      templateSetCode: "daily_prompt_v1",
      context: {},
    });
    expect(sentNotificationRepository.size).toBe(2);
    expect(
      sentNotificationRepository.countByStatus(
        SENT_NOTIFICATION_STATUS.DELIVERED,
      ),
    ).toBe(2);
  });

  it("Toss 실패 응답은 row를 보존(status=FAILED)해서 다음 실행에서 UNIQUE로 차단해요", async () => {
    const { scheduler, sentNotificationRepository, tossApiClient } = buildFlow({
      userKeys: [303],
      responses: [failResponse, okResponse()],
    });

    await scheduler.run();

    // 실패해도 row는 남고 status는 FAILED. 다음 cron에서 UNIQUE로 차단.
    expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(sentNotificationRepository.size).toBe(1);
    expect(
      sentNotificationRepository.countByStatus(SENT_NOTIFICATION_STATUS.FAILED),
    ).toBe(1);

    await scheduler.run();

    // UNIQUE 차단으로 두 번째 cron에서는 토스 호출 안 일어남.
    // = 같은 사용자에게 중복 발송 안 됨.
    expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(sentNotificationRepository.size).toBe(1);
  });

  it("스케줄러가 KST 오늘 날짜를 daily_prompt referenceId로 사용해요", async () => {
    const { scheduler, sentNotificationRepository } = buildFlow({
      userKeys: [404],
    });
    const tryInsert = jest.spyOn(sentNotificationRepository, "tryInsert");

    await scheduler.run();

    expect(tryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userKey: 404,
        type: NOTIFICATION_TYPE.DAILY_PROMPT,
        referenceId: "2026-05-26",
      }),
    );
  });
});
