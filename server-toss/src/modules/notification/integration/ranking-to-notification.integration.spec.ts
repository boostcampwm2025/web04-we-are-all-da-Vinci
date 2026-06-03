import type { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { TossTransportError } from "src/modules/auth/errors/toss.errors";
import type { TossMessengerResponse } from "src/modules/auth/schemas/toss-messenger.schema";
import type { TossApiClient } from "src/modules/auth/toss-api.client";
import {
  RankingChangedEvent,
  RANKING_CHANGED_EVENT,
} from "src/modules/ranking/events/ranking-changed.event";
import { RankingChangedListener } from "../listeners/ranking-changed.listener";
import type { NotificationAgreement } from "../notification-agreement.entity";
import type { NotificationAgreementRepository } from "../notification-agreement.repository";
import {
  NOTIFICATION_AGREEMENT_STATUS,
  NOTIFICATION_TYPE,
  SENT_NOTIFICATION_STATUS,
  type NotificationAgreementStatus,
  type NotificationType,
  type SentNotificationStatus,
} from "../notification.constants";
import { NotificationService } from "../notification.service";
import type { SentNotification } from "../sent-notification.entity";
import type { SentNotificationRepository } from "../sent-notification.repository";

// drawing 제출 → ranking 갱신 → RankingChangedEvent emit → RankingChangedListener
//   → NotificationService.send → sent_notifications status 전이 까지의 한 흐름.
// EventEmitter2를 직접 wire-up해서 @OnEvent 데코레이터 의존 없이 흐름을 검증한다.
// (데코레이터 wire-up은 NestJS DI 책임이라 별도 단위 검증 영역)

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
      sentPush: [{ contentId: "ok" }],
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
  readonly records = new Map<string, StoredNotification>();

  countByStatus(status: SentNotificationStatus): number {
    let count = 0;
    for (const record of this.records.values()) {
      if (record.status === status) count += 1;
    }
    return count;
  }

  findByUser(userKey: number): StoredNotification[] {
    const out: StoredNotification[] = [];
    for (const record of this.records.values()) {
      if (record.userKey === userKey) out.push(record);
    }
    return out;
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

class InMemoryNotificationAgreementRepository {
  private readonly agreements = new Map<
    string,
    {
      userKey: number;
      type: NotificationType;
      templateCode: string;
      status: NotificationAgreementStatus;
    }
  >();

  constructor(
    initial: Array<{
      userKey: number;
      type: NotificationType;
      templateCode: string;
      status: NotificationAgreementStatus;
    }>,
  ) {
    for (const a of initial) {
      this.agreements.set(`${a.userKey}:${a.type}:${a.templateCode}`, a);
    }
  }

  findByUserTypeTemplate(input: {
    userKey: number;
    type: NotificationType;
    templateCode: string;
  }): Promise<NotificationAgreement | null> {
    const found = this.agreements.get(
      `${input.userKey}:${input.type}:${input.templateCode}`,
    );
    return Promise.resolve((found ?? null) as NotificationAgreement | null);
  }

  async findAgreedUserKeysAmong(input: {
    userKeys: number[];
    type: NotificationType;
    templateCode: string;
  }): Promise<number[]> {
    return input.userKeys.filter((uk) => {
      const agreement = this.agreements.get(
        `${uk}:${input.type}:${input.templateCode}`,
      );
      return agreement?.status === NOTIFICATION_AGREEMENT_STATUS.AGREED;
    });
  }
}

const OVERTAKEN_TEMPLATE = "overtaken_v1";
const OVERTAKEN_AGREEMENT_TEMPLATE = "overtaken_agreement_v1";

const buildIntegration = (opts: {
  enabled?: boolean;
  agreements: Array<{
    userKey: number;
    status: NotificationAgreementStatus;
  }>;
}) => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "OVERTAKEN_NOTIFICATION_ENABLED") {
        return opts.enabled === false ? "false" : "true";
      }
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === "TOSS_TEMPLATE_OVERTAKEN") return OVERTAKEN_TEMPLATE;
      if (key === "TOSS_TEMPLATE_OVERTAKEN_AGREEMENT_CODE") {
        return OVERTAKEN_AGREEMENT_TEMPLATE;
      }
      throw new Error(`unexpected key: ${key}`);
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const sentNotificationRepository = new InMemorySentNotificationRepository();

  const notificationAgreementRepository =
    new InMemoryNotificationAgreementRepository(
      opts.agreements.map((a) => ({
        userKey: a.userKey,
        type: NOTIFICATION_TYPE.OVERTAKEN,
        templateCode: OVERTAKEN_AGREEMENT_TEMPLATE,
        status: a.status,
      })),
    );

  const tossApiClient = {
    sendMessage: jest.fn().mockResolvedValue(okResponse()),
    sendBulkMessage: jest.fn().mockResolvedValue(okResponse()),
  } as unknown as jest.Mocked<TossApiClient>;

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

  const listener = new RankingChangedListener(
    {} as never,
    configService,
    notificationAgreementRepository as unknown as NotificationAgreementRepository,
    notificationService,
  );

  const eventEmitter = new EventEmitter2();
  eventEmitter.on(
    RANKING_CHANGED_EVENT,
    // emitAsync로 핸들러 완료를 기다리기 위해 async 핸들러가 필요하다.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (event: RankingChangedEvent) => {
      await listener.handle(event);
    },
  );

  return {
    eventEmitter,
    sentNotificationRepository,
    notificationAgreementRepository,
    tossApiClient,
    configService,
  };
};

const triggerRankingChange = (
  emitter: EventEmitter2,
  overtakenUserKeys: number[],
  day = "2026-05-29",
) =>
  emitter.emitAsync(
    RANKING_CHANGED_EVENT,
    new RankingChangedEvent(999, 12345n, 1, overtakenUserKeys, day),
  );

describe("drawing 제출 → ranking 갱신 → OVERTAKEN 알림 통합 흐름", () => {
  it("추월된 동의자 모두에게 알림이 발송되고 status=DELIVERED로 끝나요", async () => {
    const { eventEmitter, sentNotificationRepository, tossApiClient } =
      buildIntegration({
        agreements: [
          {
            userKey: 101,
            status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
          },
          {
            userKey: 202,
            status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
          },
        ],
      });

    await triggerRankingChange(eventEmitter, [101, 202]);

    expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(2);
    expect(tossApiClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userKey: 101,
        templateSetCode: OVERTAKEN_TEMPLATE,
        context: { day: "2026-05-29", newRank: 1 },
      }),
    );
    expect(tossApiClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: 202 }),
    );

    expect(sentNotificationRepository.records.size).toBe(2);
    expect(
      sentNotificationRepository.countByStatus(
        SENT_NOTIFICATION_STATUS.DELIVERED,
      ),
    ).toBe(2);
    // referenceId는 user별로 분리돼야 일일 1회 제한이 user 단위로 동작.
    const record101 = sentNotificationRepository.findByUser(101)[0];
    expect(record101.referenceId).toBe("2026-05-29_101");
    expect(record101.type).toBe(NOTIFICATION_TYPE.OVERTAKEN);
  });

  it("추월된 사용자 중 동의자만 발송돼요", async () => {
    const { eventEmitter, sentNotificationRepository, tossApiClient } =
      buildIntegration({
        agreements: [
          {
            userKey: 202,
            status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
          },
          {
            userKey: 303,
            status: NOTIFICATION_AGREEMENT_STATUS.REJECTED,
          },
          // 101은 동의 기록 자체가 없음
        ],
      });

    await triggerRankingChange(eventEmitter, [101, 202, 303]);

    expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(tossApiClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: 202 }),
    );
    // 비동의자는 reserve도 안 됨 (UNIQUE 게이트 이전 단계)
    expect(sentNotificationRepository.findByUser(101)).toHaveLength(0);
    expect(sentNotificationRepository.findByUser(303)).toHaveLength(0);
    expect(sentNotificationRepository.findByUser(202)).toHaveLength(1);
  });

  it("토스 transport timeout이면 재시도 후 DELIVERED로 복구돼요", async () => {
    jest.useFakeTimers();
    try {
      const { eventEmitter, sentNotificationRepository, tossApiClient } =
        buildIntegration({
          agreements: [
            {
              userKey: 101,
              status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
            },
          ],
        });

      tossApiClient.sendMessage = jest
        .fn()
        .mockRejectedValueOnce(new TossTransportError("타임아웃"))
        .mockResolvedValueOnce(okResponse());

      const promise = triggerRankingChange(eventEmitter, [101]);
      await jest.runAllTimersAsync();
      await promise;

      expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(2);
      expect(
        sentNotificationRepository.countByStatus(
          SENT_NOTIFICATION_STATUS.DELIVERED,
        ),
      ).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("같은 day에 같은 사용자가 두 번째로 추월되어도 중복 발송 안 돼요", async () => {
    const { eventEmitter, sentNotificationRepository, tossApiClient } =
      buildIntegration({
        agreements: [
          {
            userKey: 101,
            status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
          },
        ],
      });

    await triggerRankingChange(eventEmitter, [101]);
    await triggerRankingChange(eventEmitter, [101]);

    // 두 번째 트리거에서도 listener는 호출되지만 reserve가 false 반환 → already_sent
    // 첫 번째 호출만 토스에 도달함.
    expect(tossApiClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(sentNotificationRepository.findByUser(101)).toHaveLength(1);
    expect(
      sentNotificationRepository.countByStatus(
        SENT_NOTIFICATION_STATUS.DELIVERED,
      ),
    ).toBe(1);
  });

  it("OVERTAKEN_NOTIFICATION_ENABLED=false면 listener가 즉시 스킵해요", async () => {
    const {
      eventEmitter,
      sentNotificationRepository,
      tossApiClient,
      notificationAgreementRepository,
    } = buildIntegration({
      enabled: false,
      agreements: [
        {
          userKey: 101,
          status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
        },
      ],
    });
    const findAgreedSpy = jest.spyOn(
      notificationAgreementRepository,
      "findAgreedUserKeysAmong",
    );

    await triggerRankingChange(eventEmitter, [101]);

    expect(findAgreedSpy).not.toHaveBeenCalled();
    expect(tossApiClient.sendMessage).not.toHaveBeenCalled();
    expect(sentNotificationRepository.records.size).toBe(0);
  });
});
