import { Entity, Enum, PrimaryKey } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";

@Entity({ tableName: "ad_views" })
export class AdView extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Enum({ items: () => AdType, fieldName: "ad_type" })
  type!: AdType;
}

export enum AdType {
  DRAWING = "drawing",
}
