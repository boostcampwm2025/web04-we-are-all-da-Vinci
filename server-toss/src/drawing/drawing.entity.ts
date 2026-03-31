import type { Rel } from "@mikro-orm/core";
import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";
import { Prompt } from "src/prompt/prompt.entity";
import { User } from "src/user/user.entity";

@Entity({ tableName: "drawings" })
export class Drawing extends BaseEntity {
  @PrimaryKey({ columnType: "bigint" })
  id!: bigint;

  @Property({ fieldName: "strokes", columnType: "text" })
  strokes!: string;

  @Property({ fieldName: "similarity", columnType: "text" })
  similarity!: string;

  @ManyToOne(() => User)
  user!: Rel<User>;

  @ManyToOne(() => Prompt)
  prompt!: Rel<Prompt>;
}
