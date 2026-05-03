import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";
import { User } from "../user/user.entity";
import type { Rel } from "@mikro-orm/core";

@Entity({ tableName: "ad_views" })
export class AdView extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Enum({ items: () => AdType, fieldName: "ad_type" })
  type!: AdType;

  @ManyToOne(() => User, { joinColumn: "user_key" })
  user!: Rel<User>;
}

export enum AdType {
  DRAWING = "drawing",
}
