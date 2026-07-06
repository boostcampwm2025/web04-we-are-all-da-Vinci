import { EntityRepository } from "@mikro-orm/mysql";
import {
  NOTIFICATION_AGREEMENT_STATUS,
  type NotificationType,
} from "./notification.constants";
import { SentNotification } from "./sent-notification.entity";

export class SentNotificationRepository extends EntityRepository<SentNotification> {
  /**
   * 오늘 KST 범위에 drawings 테이블에 row가 없는 user_key 목록.
   * 한 번도 그림을 그린 적 없는 사용자도 포함된다.
   */
  async findUserKeysWithNoDrawingIn(range: {
    start: Date;
    end: Date;
  }): Promise<number[]> {
    const rows = await this.em.execute<{ user_key: number }[]>(
      "select u.user_key from users u " +
        "where not exists (" +
        "  select 1 from drawings d " +
        "  where d.user_key = u.user_key " +
        "    and d.created_at >= ? and d.created_at < ?" +
        ")",
      [range.start, range.end],
    );
    return rows.map((row) => row.user_key);
  }

  /**
   * 일일 제시 그림 알림 발송 대상:
   * - 오늘 그림을 아직 안 그림
   * - 해당 동의 템플릿에 AGREED 상태
   * - 같은 referenceId로 아직 발송 기록 없음
   */
  async findAgreedUserKeysWithNoDrawingIn(input: {
    range: { start: Date; end: Date };
    type: NotificationType;
    referenceId: string;
    agreementTemplateCode: string;
  }): Promise<number[]> {
    const rows = await this.em.execute<{ user_key: number }[]>(
      "select u.user_key from users u " +
        "inner join notification_agreements na " +
        "  on na.user_key = u.user_key " +
        " and na.type = ? " +
        " and na.template_code = ? " +
        " and na.status = ? " +
        "where not exists (" +
        "  select 1 from drawings d " +
        "  where d.user_key = u.user_key " +
        "    and d.created_at >= ? and d.created_at < ?" +
        ") " +
        "and not exists (" +
        "  select 1 from sent_notifications sn " +
        "  where sn.user_key = u.user_key " +
        "    and sn.type = ? " +
        "    and sn.reference_id = ?" +
        ")",
      [
        input.type,
        input.agreementTemplateCode,
        NOTIFICATION_AGREEMENT_STATUS.AGREED,
        input.range.start,
        input.range.end,
        input.type,
        input.referenceId,
      ],
    );
    return rows.map((row) => row.user_key);
  }
}
