import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";

@Entity({ tableName: "rankings" })
export class Ranking extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ type: "varchar(10)", length: 10 })
  name!: string;

  @Property({ fieldName: "strokes", type: "text" })
  strokes!: string;

  @Property({ fieldName: "similarity", type: "text" })
  similarity!: string;

  @Property({ fieldName: "user_id", type: "bigint" })
  userId!: bigint;

  @Property({ fieldName: "drawing_id", type: "bigint" })
  drawingId!: bigint;
}
