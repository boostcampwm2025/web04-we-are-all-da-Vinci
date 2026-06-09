import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityRepository } from "@mikro-orm/mysql";
import { NotificationAgreement } from "./notification-agreement.entity";
import {
  NOTIFICATION_AGREEMENT_STATUS,
  type NotificationAgreementStatus,
  type NotificationType,
} from "./notification.constants";

export class NotificationAgreementRepository extends EntityRepository<NotificationAgreement> {
  // OVERTAKEN처럼 대상 사용자가 N명인 알림에서 한 번의 쿼리로 동의자만 추출.
  async findAgreedUserKeysAmong(input: {
    userKeys: number[];
    type: NotificationType;
    templateCode: string;
  }): Promise<number[]> {
    if (input.userKeys.length === 0) return [];
    const agreements = await this.find({
      userKey: { $in: input.userKeys },
      type: input.type,
      templateCode: input.templateCode,
      status: NOTIFICATION_AGREEMENT_STATUS.AGREED,
    });
    return agreements.map((a) => a.userKey);
  }

  findByUserTypeTemplate(input: {
    userKey: number;
    type: NotificationType;
    templateCode: string;
  }): Promise<NotificationAgreement | null> {
    return this.findOne({
      userKey: input.userKey,
      type: input.type,
      templateCode: input.templateCode,
    });
  }

  async upsertStatus(input: {
    userKey: number;
    type: NotificationType;
    templateCode: string;
    status: NotificationAgreementStatus;
    agreedAt?: Date | null;
    rejectedAt?: Date | null;
    lastEventAt: Date;
  }): Promise<NotificationAgreement> {
    const existing = await this.findByUserTypeTemplate(input);
    if (existing) {
      return this.applyStatus(existing, input);
    }

    try {
      const entity = this.em.create(NotificationAgreement, input);
      await this.em.flush();
      return entity;
    } catch (err) {
      // 동시 요청으로 read와 create 사이에 같은 (userKey, type, templateCode)가
      // 생성되면 UNIQUE 충돌. 그 row를 재조회해 업데이트로 처리한다.
      if (err instanceof UniqueConstraintViolationException) {
        const conflicted = await this.findByUserTypeTemplate(input);
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
