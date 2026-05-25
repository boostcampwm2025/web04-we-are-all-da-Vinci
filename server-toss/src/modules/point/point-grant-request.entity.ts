import type { Opt, Rel } from "@mikro-orm/core";
import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { User } from "../user/user.entity";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { PointReason } from "./point-log.entity";

@Entity({ tableName: "point_grant_requests" })
export class PointGrantRequest extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @ManyToOne(() => User, { joinColumn: "user_key" })
  user!: Rel<User>;

  @Enum({ items: () => PointGrantStatus, name: "point_grant_status" })
  status!: PointGrantStatus;

  @Property({ name: "point_amount", type: "int" })
  pointAmount!: number;

  @Enum({ items: () => PointReason, name: "point_reason" })
  reason!: PointReason;

  @Property({ name: "attempt_count", type: "int" })
  attemptCount!: number;

  @Property({ name: "max_attempt_count", type: "int" })
  maxAttemptCount!: number;

  @Property({ name: "next_retry_at", type: "timestamp", nullable: true })
  nextRetryAt?: Opt<Date>;

  @Property({ name: "locked_at", type: "timestamp", nullable: true })
  lockedAt?: Opt<Date>;

  @Property({ name: "locked_by", type: "varchar", length: 255, nullable: true })
  lockedBy?: Opt<string>;

  @Property({ name: "processed_at", type: "timestamp", nullable: true })
  processedAt?: Opt<Date>;
}

export enum PointGrantStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  FAILED = "failed",
  SUCCEEDED = "succeeded",
}
