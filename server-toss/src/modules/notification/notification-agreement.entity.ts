import { EntityRepositoryType } from "@mikro-orm/core";
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import type {
  NotificationAgreementStatus,
  NotificationType,
} from "./notification.constants";
import { NotificationAgreementRepository } from "./notification-agreement.repository";

@Entity({
  tableName: "notification_agreements",
  repository: () => NotificationAgreementRepository,
})
@Index({
  name: "idx_notification_agreements_type_status",
  properties: ["type", "status"],
})
export class NotificationAgreement extends BaseEntity {
  [EntityRepositoryType]?: NotificationAgreementRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ fieldName: "user_key", type: "integer", unsigned: true })
  userKey!: number;

  @Property({ fieldName: "type", type: "varchar(32)", length: 32 })
  type!: NotificationType;

  @Property({ fieldName: "template_code", type: "varchar(128)", length: 128 })
  templateCode!: string;

  @Property({ fieldName: "status", type: "varchar(16)", length: 16 })
  status!: NotificationAgreementStatus;

  @Property({ fieldName: "agreed_at", type: "datetime", nullable: true })
  agreedAt?: Date | null;

  @Property({ fieldName: "rejected_at", type: "datetime", nullable: true })
  rejectedAt?: Date | null;

  @Property({ fieldName: "last_event_at", type: "datetime" })
  lastEventAt!: Date;
}
