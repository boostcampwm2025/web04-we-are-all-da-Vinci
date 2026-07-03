import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "prompts" })
export class Prompt {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ type: "mediumtext", columnType: "mediumtext" })
  strokes!: string;
}
