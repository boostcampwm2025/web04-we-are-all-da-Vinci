import type { Rel } from "@mikro-orm/core";
import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";
import { Prompt } from "src/modules/prompt/prompt.entity";
import { User } from "src/modules/user/user.entity";

@Entity({ tableName: "drawings" })
export class Drawing extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ fieldName: "strokes", type: "text" })
  strokes!: string;

  @Property({ fieldName: "similarity", type: "text" })
  similarity!: string;

  @ManyToOne(() => User)
  user!: Rel<User>;

  @ManyToOne(() => Prompt)
  prompt!: Rel<Prompt>;
}
