import type { Rel } from "@mikro-orm/core";
import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";
import { User } from "src/modules/user/user.entity";

@Entity({ tableName: "point_logs" })
export class PointLog extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Enum({ items: () => PointReason, fieldName: "point_reason" })
  reason!: PointReason;

  @Property({ fieldName: "point_amount", type: "int" })
  pointAmount!: number;

  @ManyToOne(() => User)
  user!: Rel<User>;
}

export enum PointReason {
  AD = "ad",
  SHARE = "share",
  DRAWING = "drawing",
}
