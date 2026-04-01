import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";

@Entity({ tableName: "rankings" })
export class Ranking extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ columnType: "varchar(10)", length: 10, type: "varchar(10)" })
  name!: string;

  @Property({ fieldName: "strokes", columnType: "text", type: "text" })
  strokes!: string;

  @Property({ fieldName: "similarity", columnType: "text", type: "text" })
  similarity!: string;

  @Property({ fieldName: "user_id", columnType: "bigint", type: "bigint" })
  userId!: bigint;

  @Property({ fieldName: "drawing_id", columnType: "bigint", type: "bigint" })
  drawingId!: bigint;
}
