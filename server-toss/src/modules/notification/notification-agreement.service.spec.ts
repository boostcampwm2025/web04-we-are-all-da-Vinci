import type { ConfigService } from "@nestjs/config";
import { NotificationAgreementService } from "./notification-agreement.service";
import type { NotificationAgreement } from "./notification-agreement.entity";
import type { NotificationAgreementRepository } from "./notification-agreement.repository";
import {
  NOTIFICATION_AGREEMENT_STATUS,
  NOTIFICATION_TYPE,
} from "./notification.constants";

const AGREEMENT_TEMPLATE_CODE = "daily_prompt_agreement_v1";

const buildService = () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === "TOSS_TEMPLATE_DAILY_PROMPT_AGREEMENT_CODE") {
        return AGREEMENT_TEMPLATE_CODE;
      }
      throw new Error(`unexpected key: ${key}`);
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const notificationAgreementRepository = {
    findByUserTypeTemplate: jest.fn(),
    upsertStatus: jest.fn(),
  } as unknown as jest.Mocked<NotificationAgreementRepository>;

  const service = new NotificationAgreementService(
    configService,
    notificationAgreementRepository,
  );

  return { service, configService, notificationAgreementRepository };
};

describe("NotificationAgreementService", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-26T03:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("동의 기록이 없으면 unknown 상태를 반환한다", async () => {
    const { service, notificationAgreementRepository } = buildService();
    notificationAgreementRepository.findByUserTypeTemplate.mockResolvedValue(
      null,
    );

    const result = await service.getDailyPromptAgreement(123);

    expect(result).toEqual({
      status: "unknown",
      templateCode: AGREEMENT_TEMPLATE_CODE,
      agreedAt: null,
      rejectedAt: null,
      lastEventAt: null,
    });
    expect(
      notificationAgreementRepository.findByUserTypeTemplate,
    ).toHaveBeenCalledWith({
      userKey: 123,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      templateCode: AGREEMENT_TEMPLATE_CODE,
    });
  });

  it.each(["newAgreement", "alreadyAgreed"] as const)(
    "%s 이벤트를 AGREED 상태로 저장한다",
    async (eventType) => {
      const { service, notificationAgreementRepository } = buildService();
      const now = new Date("2026-05-26T03:00:00.000Z");
      notificationAgreementRepository.upsertStatus.mockResolvedValue({
        userKey: 123,
        type: NOTIFICATION_TYPE.DAILY_PROMPT,
        templateCode: AGREEMENT_TEMPLATE_CODE,
        status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
        agreedAt: now,
        rejectedAt: null,
        lastEventAt: now,
      } as NotificationAgreement);

      const result = await service.saveDailyPromptAgreement({
        userKey: 123,
        eventType,
      });

      expect(notificationAgreementRepository.upsertStatus).toHaveBeenCalledWith(
        {
          userKey: 123,
          type: NOTIFICATION_TYPE.DAILY_PROMPT,
          templateCode: AGREEMENT_TEMPLATE_CODE,
          status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
          agreedAt: now,
          rejectedAt: undefined,
          lastEventAt: now,
        },
      );
      expect(result.status).toBe("agreed");
      expect(result.agreedAt).toBe("2026-05-26T03:00:00.000Z");
    },
  );

  it("agreementRejected 이벤트를 REJECTED 상태로 저장한다", async () => {
    const { service, notificationAgreementRepository } = buildService();
    const now = new Date("2026-05-26T03:00:00.000Z");
    notificationAgreementRepository.upsertStatus.mockResolvedValue({
      userKey: 123,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      templateCode: AGREEMENT_TEMPLATE_CODE,
      status: NOTIFICATION_AGREEMENT_STATUS.REJECTED,
      agreedAt: null,
      rejectedAt: now,
      lastEventAt: now,
    } as NotificationAgreement);

    const result = await service.saveDailyPromptAgreement({
      userKey: 123,
      eventType: "agreementRejected",
    });

    expect(notificationAgreementRepository.upsertStatus).toHaveBeenCalledWith({
      userKey: 123,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      templateCode: AGREEMENT_TEMPLATE_CODE,
      status: NOTIFICATION_AGREEMENT_STATUS.REJECTED,
      agreedAt: undefined,
      rejectedAt: now,
      lastEventAt: now,
    });
    expect(result.status).toBe("rejected");
    expect(result.rejectedAt).toBe("2026-05-26T03:00:00.000Z");
  });
});
