import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/mysql";
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
import { NotificationAgreement } from "./notification-agreement.entity";
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
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
    private readonly notificationAgreementRepository: NotificationAgreementRepository,
  ) {}

  async getDailyPromptAgreement(
    userKey: number,
  ): Promise<NotificationAgreementResponse> {
    return this.getAgreement(
      userKey,
      NOTIFICATION_TYPE.DAILY_PROMPT,
      "TOSS_TEMPLATE_DAILY_PROMPT",
    );
  }

  async saveDailyPromptAgreement(input: {
    userKey: number;
    eventType: NotificationAgreementEvent;
  }): Promise<NotificationAgreementResponse> {
    return this.saveAgreement({
      ...input,
      type: NOTIFICATION_TYPE.DAILY_PROMPT,
      configKey: "TOSS_TEMPLATE_DAILY_PROMPT",
    });
  }

  async getOvertakenAgreement(
    userKey: number,
  ): Promise<NotificationAgreementResponse> {
    return this.getAgreement(
      userKey,
      NOTIFICATION_TYPE.OVERTAKEN,
      "TOSS_TEMPLATE_OVERTAKEN",
    );
  }

  async saveOvertakenAgreement(input: {
    userKey: number;
    eventType: NotificationAgreementEvent;
  }): Promise<NotificationAgreementResponse> {
    return this.saveAgreement({
      ...input,
      type: NOTIFICATION_TYPE.OVERTAKEN,
      configKey: "TOSS_TEMPLATE_OVERTAKEN",
    });
  }

  async getAttendanceStreakAgreement(
    userKey: number,
  ): Promise<NotificationAgreementResponse> {
    return this.getAgreement(
      userKey,
      NOTIFICATION_TYPE.ATTENDANCE_STREAK,
      "TOSS_TEMPLATE_ATTENDANCE_STREAK",
    );
  }

  async saveAttendanceStreakAgreement(input: {
    userKey: number;
    eventType: NotificationAgreementEvent;
  }): Promise<NotificationAgreementResponse> {
    return this.saveAgreement({
      ...input,
      type: NOTIFICATION_TYPE.ATTENDANCE_STREAK,
      configKey: "TOSS_TEMPLATE_ATTENDANCE_STREAK",
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

    const upsertInput = {
      userKey: input.userKey,
      type: input.type,
      templateCode,
      status,
      agreedAt:
        status === NOTIFICATION_AGREEMENT_STATUS.AGREED ? now : undefined,
      rejectedAt:
        status === NOTIFICATION_AGREEMENT_STATUS.REJECTED ? now : undefined,
      lastEventAt: now,
    };

    const agreement = await this.upsertAgreementStatus(upsertInput);

    return {
      status: toPublicStatus(agreement.status),
      templateCode: agreement.templateCode,
      agreedAt: toIsoOrNull(agreement.agreedAt),
      rejectedAt: toIsoOrNull(agreement.rejectedAt),
      lastEventAt: toIsoOrNull(agreement.lastEventAt),
    };
  }

  private async upsertAgreementStatus(input: {
    userKey: number;
    type: NotificationType;
    templateCode: string;
    status: NotificationAgreementStatus;
    agreedAt?: Date | null;
    rejectedAt?: Date | null;
    lastEventAt: Date;
  }): Promise<NotificationAgreement> {
    const existing =
      await this.notificationAgreementRepository.findByUserTypeTemplate(input);
    if (existing) {
      return this.applyStatus(existing, input);
    }

    try {
      const entity = this.em.create(NotificationAgreement, input);
      this.em.persist(entity);
      await this.em.flush();
      return entity;
    } catch (err) {
      if (err instanceof UniqueConstraintViolationException) {
        const conflicted =
          await this.notificationAgreementRepository.findByUserTypeTemplate(
            input,
          );
        if (conflicted) {
          return this.applyStatus(conflicted, input);
        }
      }
      throw err;
    }
  }

  private async applyStatus(
    entity: NotificationAgreement,
    input: {
      status: NotificationAgreementStatus;
      agreedAt?: Date | null;
      rejectedAt?: Date | null;
      lastEventAt: Date;
    },
  ): Promise<NotificationAgreement> {
    entity.status = input.status;
    entity.agreedAt = input.agreedAt ?? entity.agreedAt ?? null;
    entity.rejectedAt = input.rejectedAt ?? entity.rejectedAt ?? null;
    entity.lastEventAt = input.lastEventAt;
    await this.em.flush();
    return entity;
  }
}
