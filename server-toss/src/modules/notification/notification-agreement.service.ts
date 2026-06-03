import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  NotificationAgreementEvent,
  NotificationAgreementResponse,
  NotificationAgreementStatus as PublicNotificationAgreementStatus,
} from "@toss/shared";
import {
  NOTIFICATION_AGREEMENT_STATUS,
  NOTIFICATION_TYPE,
  type NotificationAgreementStatus,
  type NotificationType,
} from "./notification.constants";
import { NotificationAgreementRepository } from "./notification-agreement.repository";

const toIsoOrNull = (date: Date | null | undefined): string | null =>
  date ? date.toISOString() : null;

const toPublicStatus = (
  status: NotificationAgreementStatus | undefined,
): PublicNotificationAgreementStatus => {
  if (status === NOTIFICATION_AGREEMENT_STATUS.AGREED) return "agreed";
  if (status === NOTIFICATION_AGREEMENT_STATUS.REJECTED) return "rejected";
  return "unknown";
};

const mapEventToStatus = (
  eventType: NotificationAgreementEvent,
): NotificationAgreementStatus =>
  eventType === "agreementRejected"
    ? NOTIFICATION_AGREEMENT_STATUS.REJECTED
    : NOTIFICATION_AGREEMENT_STATUS.AGREED;

@Injectable()
export class NotificationAgreementService {
  constructor(
    private readonly configService: ConfigService,
    private readonly notificationAgreementRepository: NotificationAgreementRepository,
  ) {}

  async getDailyPromptAgreement(
    userKey: number,
  ): Promise<NotificationAgreementResponse> {
    return this.getAgreement(
      userKey,
      NOTIFICATION_TYPE.DAILY_PROMPT,
      "TOSS_TEMPLATE_DAILY_PROMPT_AGREEMENT_CODE",
    );
  }

  async saveDailyPromptAgreement(input: {
    userKey: number;
    eventType: NotificationAgreementEvent;
  }): Promise<NotificationAgreementResponse> {
    return this.saveAgreement({
      ...input,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      configKey: "TOSS_TEMPLATE_DAILY_PROMPT_AGREEMENT_CODE",
    });
  }

  async getOvertakenAgreement(
    userKey: number,
  ): Promise<NotificationAgreementResponse> {
    return this.getAgreement(
      userKey,
      NOTIFICATION_TYPE.OVERTAKEN,
      "TOSS_TEMPLATE_OVERTAKEN_AGREEMENT_CODE",
    );
  }

  async saveOvertakenAgreement(input: {
    userKey: number;
    eventType: NotificationAgreementEvent;
  }): Promise<NotificationAgreementResponse> {
    return this.saveAgreement({
      ...input,
      type: NOTIFICATION_TYPE.OVERTAKEN,
      configKey: "TOSS_TEMPLATE_OVERTAKEN_AGREEMENT_CODE",
    });
  }

  // 알림 타입별 동의 조회·저장 공통 로직. templateCode는 type별 환경변수에서 lookup.
  private async getAgreement(
    userKey: number,
    type: NotificationType,
    configKey: string,
  ): Promise<NotificationAgreementResponse> {
    const templateCode = this.configService.getOrThrow<string>(configKey);
    const agreement =
      await this.notificationAgreementRepository.findByUserTypeTemplate({
        userKey,
        type,
        templateCode,
      });

    return {
      status: toPublicStatus(agreement?.status),
      templateCode,
      agreedAt: toIsoOrNull(agreement?.agreedAt),
      rejectedAt: toIsoOrNull(agreement?.rejectedAt),
      lastEventAt: toIsoOrNull(agreement?.lastEventAt),
    };
  }

  private async saveAgreement(input: {
    userKey: number;
    type: NotificationType;
    eventType: NotificationAgreementEvent;
    configKey: string;
  }): Promise<NotificationAgreementResponse> {
    const templateCode = this.configService.getOrThrow<string>(input.configKey);
    const status = mapEventToStatus(input.eventType);
    const now = new Date();

    const agreement = await this.notificationAgreementRepository.upsertStatus({
      userKey: input.userKey,
      type: input.type,
      templateCode,
      status,
      agreedAt:
        status === NOTIFICATION_AGREEMENT_STATUS.AGREED ? now : undefined,
      rejectedAt:
        status === NOTIFICATION_AGREEMENT_STATUS.REJECTED ? now : undefined,
      lastEventAt: now,
    });

    return {
      status: toPublicStatus(agreement.status),
      templateCode: agreement.templateCode,
      agreedAt: toIsoOrNull(agreement.agreedAt),
      rejectedAt: toIsoOrNull(agreement.rejectedAt),
      lastEventAt: toIsoOrNull(agreement.lastEventAt),
    };
  }
}
