import { EntityRepositoryType } from "@mikro-orm/core";
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import {
  SENT_NOTIFICATION_STATUS,
  type NotificationType,
  type SentNotificationStatus,
} from "./notification.constants";
import { SentNotificationRepository } from "./sent-notification.repository";

// 복합 UNIQUE 제약(user_key, type, reference_id)은 마이그레이션 SQL로 직접 추가.
// 멱등 INSERT 시 DB가 던지는 UniqueConstraintViolationException으로 중복 차단.
@Entity({
  tableName: "sent_notifications",
  repository: () => SentNotificationRepository,
})
@Index({
  name: "idx_sent_notifications_user_sent_at",
  properties: ["userKey", "sentAt"],
})
@Index({
  name: "idx_sent_notifications_type_status_sent_at",
  properties: ["type", "status", "sentAt"],
})
export class SentNotification extends BaseEntity {
  [EntityRepositoryType]?: SentNotificationRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ fieldName: "user_key", type: "integer", unsigned: true })
  userKey!: number;

  @Property({ fieldName: "type", type: "varchar(32)", length: 32 })
  type!: NotificationType;

  @Property({ fieldName: "reference_id", type: "varchar(64)", length: 64 })
  referenceId!: string;

  @Property({ fieldName: "sent_at", type: "datetime" })
  sentAt!: Date;

  @Property({
    fieldName: "status",
    type: "varchar(16)",
    length: 16,
    default: SENT_NOTIFICATION_STATUS.IN_FLIGHT,
  })
  status: SentNotificationStatus = SENT_NOTIFICATION_STATUS.IN_FLIGHT;
}
