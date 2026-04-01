import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "prompts" })
export class Prompt {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ columnType: "text", type: "text" })
  strokes!: string;
}
