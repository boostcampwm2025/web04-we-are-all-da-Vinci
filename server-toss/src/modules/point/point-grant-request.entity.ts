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
import { getSeoulDateTime } from "src/common/util/time.util";

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

  @Property({ name: "last_error", type: "text", nullable: true })
  lastError?: Opt<string>;

  succeeded() {
    this.status = PointGrantStatus.SUCCEEDED;
  }

  retry() {
    this.status = PointGrantStatus.RETRY;
    this.attemptCount += 1;

    if (this.attemptCount === this.maxAttemptCount) {
      this.failed("재시도 횟수 초과");
      return;
    }
    this.nextRetryAt = new Date(
      getSeoulDateTime().getTime() + this.calculateBackOff(this.attemptCount),
    );
  }

  failed(errorMessage?: string) {
    this.status = PointGrantStatus.FAILED;
    this.lastError = errorMessage;
  }

  processing() {
    this.status = PointGrantStatus.PROCESSING;
    this.processedAt = getSeoulDateTime();
  }

  private calculateBackOff(attemptCount: number) {
    const delays = [0, 5_000, 30_000, 60_000, 300_000];
    return delays[Math.min(attemptCount, delays.length - 1)];
  }
}

export enum PointGrantStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  RETRY = "retry",
  FAILED = "failed",
  SUCCEEDED = "succeeded",
}
