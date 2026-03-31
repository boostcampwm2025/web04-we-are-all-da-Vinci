import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";

@Entity({ tableName: "rankings" })
export class Ranking extends BaseEntity {
  @PrimaryKey()
  id!: bigint;

  @Property({ columnType: "varchar", length: 10 })
  name!: string;

  @Property({ fieldName: "strokes", columnType: "text" })
  strokes!: string;

  @Property({ fieldName: "similarity", columnType: "text" })
  similarity!: string;

  @Property({ fieldName: "user_id", columnType: "bigint" })
  userId!: bigint;

  @Property({ fieldName: "drawing_id", columnType: "bigint" })
  drawingId!: bigint;
}
