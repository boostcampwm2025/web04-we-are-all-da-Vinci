import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/mysql";
import type { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { TossTransportError } from "src/external/toss/common/toss.errors";
import type { TossMessengerResponse } from "../schemas/toss-messenger.schema";
import type { NotificationSender } from "../port/notification-sender.interface";
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

class InMemoryNotificationStore {
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

const buildInMemoryEm = (store: InMemoryNotificationStore) => {
  let pendingEntity: StoredNotification | null = null;

  return {
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
};

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
      throw new Error(`unexpected key: ${key}`);
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const store = new InMemoryNotificationStore();
  const em = buildInMemoryEm(store);

  const notificationAgreementRepository =
    new InMemoryNotificationAgreementRepository(
      opts.agreements.map((a) => ({
        userKey: a.userKey,
        type: NOTIFICATION_TYPE.OVERTAKEN,
        templateCode: OVERTAKEN_TEMPLATE,
        status: a.status,
      })),
    );

  const notificationSender = {
    sendMessage: jest.fn().mockResolvedValue(okResponse()),
    sendBulkMessage: jest.fn().mockResolvedValue(okResponse()),
  } as unknown as jest.Mocked<NotificationSender>;

  const notificationService = new NotificationService(em, notificationSender);

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
    store,
    notificationAgreementRepository,
    notificationSender,
    configService,
  };
};

const triggerRankingChange = (
  emitter: EventEmitter2,
  overtakenUserKeys: number[],
  options: {
    day?: string;
    triggerDrawingId?: bigint;
    triggerUserKey?: number;
  } = {},
) => {
  const {
    day = "2026-05-29",
    triggerDrawingId = 12345n,
    triggerUserKey = 999,
  } = options;
  return emitter.emitAsync(
    RANKING_CHANGED_EVENT,
    new RankingChangedEvent(
      triggerUserKey,
      triggerDrawingId,
      1,
      overtakenUserKeys,
      day,
    ),
  );
};

describe("drawing 제출 → ranking 갱신 → OVERTAKEN 알림 통합 흐름", () => {
  it("추월된 동의자 모두에게 알림이 발송되고 status=DELIVERED로 끝나요", async () => {
    const { eventEmitter, store, notificationSender } = buildIntegration({
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

    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(2);
    expect(notificationSender.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userKey: 101,
        templateSetCode: OVERTAKEN_TEMPLATE,
        context: { day: "2026-05-29", newRank: 1 },
      }),
    );
    expect(notificationSender.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: 202 }),
    );

    expect(store.records.size).toBe(2);
    expect(store.countByStatus(SENT_NOTIFICATION_STATUS.DELIVERED)).toBe(2);
    const record101 = store.findByUser(101)[0];
    expect(record101.referenceId).toBe("12345_101");
    expect(record101.type).toBe(NOTIFICATION_TYPE.OVERTAKEN);
  });

  it("추월된 사용자 중 동의자만 발송돼요", async () => {
    const { eventEmitter, store, notificationSender } = buildIntegration({
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

    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(1);
    expect(notificationSender.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userKey: 202 }),
    );
    expect(store.findByUser(101)).toHaveLength(0);
    expect(store.findByUser(303)).toHaveLength(0);
    expect(store.findByUser(202)).toHaveLength(1);
  });

  it("토스 transport timeout이면 재시도 후 DELIVERED로 복구돼요", async () => {
    jest.useFakeTimers();
    try {
      const { eventEmitter, store, notificationSender } = buildIntegration({
        agreements: [
          {
            userKey: 101,
            status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
          },
        ],
      });

      notificationSender.sendMessage = jest
        .fn()
        .mockRejectedValueOnce(new TossTransportError("타임아웃"))
        .mockResolvedValueOnce(okResponse());

      const promise = triggerRankingChange(eventEmitter, [101]);
      await jest.runAllTimersAsync();
      await promise;

      expect(notificationSender.sendMessage).toHaveBeenCalledTimes(2);
      expect(store.countByStatus(SENT_NOTIFICATION_STATUS.DELIVERED)).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("같은 추월 사건(동일 제출)이 중복 처리되면 한 번만 발송돼요", async () => {
    const { eventEmitter, store, notificationSender } = buildIntegration({
      agreements: [
        {
          userKey: 101,
          status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
        },
      ],
    });

    await triggerRankingChange(eventEmitter, [101]);
    await triggerRankingChange(eventEmitter, [101]);

    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(1);
    expect(store.findByUser(101)).toHaveLength(1);
    expect(store.countByStatus(SENT_NOTIFICATION_STATUS.DELIVERED)).toBe(1);
  });

  it("다른 사람의 제출로 같은 사용자가 다시 추월되면 매번 발송돼요", async () => {
    const { eventEmitter, store, notificationSender } = buildIntegration({
      agreements: [
        {
          userKey: 101,
          status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
        },
      ],
    });

    await triggerRankingChange(eventEmitter, [101], {
      triggerUserKey: 901,
      triggerDrawingId: 1001n,
    });
    await triggerRankingChange(eventEmitter, [101], {
      triggerUserKey: 902,
      triggerDrawingId: 1002n,
    });

    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(2);
    expect(store.findByUser(101)).toHaveLength(2);
    expect(store.countByStatus(SENT_NOTIFICATION_STATUS.DELIVERED)).toBe(2);
  });

  it("같은 사람이 다른 제출로 같은 사용자를 다시 추월해도 매번 발송돼요", async () => {
    const { eventEmitter, store, notificationSender } = buildIntegration({
      agreements: [
        {
          userKey: 101,
          status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
        },
      ],
    });

    await triggerRankingChange(eventEmitter, [101], {
      triggerUserKey: 901,
      triggerDrawingId: 2001n,
    });
    await triggerRankingChange(eventEmitter, [101], {
      triggerUserKey: 901,
      triggerDrawingId: 2002n,
    });

    expect(notificationSender.sendMessage).toHaveBeenCalledTimes(2);
    expect(store.findByUser(101)).toHaveLength(2);
  });

  it("OVERTAKEN_NOTIFICATION_ENABLED=false면 listener가 즉시 스킵해요", async () => {
    const {
      eventEmitter,
      store,
      notificationSender,
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
    expect(notificationSender.sendMessage).not.toHaveBeenCalled();
    expect(store.records.size).toBe(0);
  });
});
