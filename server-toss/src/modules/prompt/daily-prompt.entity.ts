import type { Opt, Rel } from "@mikro-orm/core";
import {
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { Prompt } from "./prompt.entity";

@Entity({ tableName: "daily_prompts" })
export class DailyPrompt {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @ManyToOne(() => Prompt)
  prompt!: Rel<Prompt>;

  @Property({
    fieldName: "prompt_date",
    columnType: "date",
    type: "date",
    onCreate: () => new Date(),
  })
  promptDate: Opt<Date> = new Date();
}
