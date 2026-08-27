import { EntityRepository } from "@mikro-orm/mysql";
import { NotificationAgreement } from "./notification-agreement.entity";
import {
  NOTIFICATION_AGREEMENT_STATUS,
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
}
