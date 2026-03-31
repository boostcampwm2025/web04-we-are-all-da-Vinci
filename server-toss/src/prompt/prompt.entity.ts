import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "prompts" })
export class Prompt {
  @PrimaryKey()
  id!: bigint;

  @Property({ columnType: "text" })
  strokes!: string;
}
