import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityRepository } from "@mikro-orm/mysql";
import {
  NOTIFICATION_AGREEMENT_STATUS,
  SENT_NOTIFICATION_STATUS,
  type NotificationType,
  type SentNotificationStatus,
} from "./notification.constants";
import { SentNotification } from "./sent-notification.entity";

export class SentNotificationRepository extends EntityRepository<SentNotification> {
  /**
   * 같은 (userKey, type, referenceId)가 이미 있으면 false 반환 (이미 발송 시도됨).
   * INSERT 성공하면 새 row를 status=IN_FLIGHT로 만들고 반환.
   * row를 안 지우는 이유: 다음 cron이 같은 day의 row를 만나면 UNIQUE 제약이 재발송 차단.
   */
  async tryInsert(input: {
    userKey: number;
    type: NotificationType;
    referenceId: string;
    sentAt: Date;
  }): Promise<SentNotification | false> {
    const entity = this.em.create(SentNotification, {
      userKey: input.userKey,
      type: input.type,
      referenceId: input.referenceId,
      sentAt: input.sentAt,
      status: SENT_NOTIFICATION_STATUS.IN_FLIGHT,
    });

    try {
      await this.em.flush();
      return entity;
    } catch (err) {
      if (err instanceof UniqueConstraintViolationException) {
        // 실패한 entity를 수동으로 UoW에서 빼낼 필요 없음: MikroORM v7의 flush()→
        // UnitOfWork.commit()은 finally에서 postCommitCleanup()으로 persist stack을
        // 비우므로(insert 실패 시에도), 같은 RequestContext의 다음 flush가 이 entity를
        // 재삽입하지 않는다. (sendBulk 청크 루프에서 연쇄 실패가 생기지 않음)
        return false;
      }
      throw err;
    }
  }

  async updateStatus(
    entity: SentNotification,
    status: SentNotificationStatus,
  ): Promise<void> {
    entity.status = status;
    await this.em.flush();
  }

  async updateStatusMany(
    entities: SentNotification[],
    status: SentNotificationStatus,
  ): Promise<void> {
    for (const entity of entities) {
      entity.status = status;
    }
    await this.em.flush();
  }

  // 서버 크래시 등으로 IN_FLIGHT 상태가 영원히 잔존하는 row를 FAILED로 자동 전환.
  // 이게 없으면 UNIQUE 제약 때문에 같은 user/day에 재발송도 안 되어 사용자가 영영 알림 못 받음.
  // 반환: 영향받은 row 수 (운영 모니터링용 로그)
  async markStaleInFlightAsFailed(staleBefore: Date): Promise<number> {
    return this.nativeUpdate(
      {
        status: SENT_NOTIFICATION_STATUS.IN_FLIGHT,
        sentAt: { $lt: staleBefore },
      },
      {
        status: SENT_NOTIFICATION_STATUS.FAILED,
      },
    );
  }

  // 운영자가 SQL/관리 콘솔로 정리할 때 쓰는 메서드. 정상 흐름에서는 호출 안 함.
  async deleteOne(entity: SentNotification): Promise<void> {
    this.em.remove(entity);
    await this.em.flush();
  }

  async deleteMany(entities: SentNotification[]): Promise<void> {
    for (const entity of entities) {
      this.em.remove(entity);
    }
    await this.em.flush();
  }

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
