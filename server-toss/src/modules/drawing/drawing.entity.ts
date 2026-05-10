import { EntityRepositoryType, type Rel } from "@mikro-orm/core";
import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { Prompt } from "src/modules/prompt/prompt.entity";
import { User } from "src/modules/user/user.entity";
import { DrawingRepository } from "./drawing.repository";

@Entity({ tableName: "drawings", repository: () => DrawingRepository })
export class Drawing extends BaseEntity {
  [EntityRepositoryType]?: DrawingRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ fieldName: "strokes", type: "text" })
  strokes!: string;

  @Property({ fieldName: "similarity", type: "text" })
  similarity!: string;

  @Property({ fieldName: "score", type: "double" })
  score!: number;

  @ManyToOne(() => User, { joinColumn: "user_key" })
  user!: Rel<User>;

  @ManyToOne(() => Prompt)
  prompt!: Rel<Prompt>;
}
