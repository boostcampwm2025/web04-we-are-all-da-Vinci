import type { Opt, Rel } from "@mikro-orm/core";
import { EntityRepositoryType } from "@mikro-orm/core";
import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { User } from "src/modules/user/user.entity";
import { Quest } from "./quest.entity";
import { UserQuestRepository } from "../repository/user-quest.repository";

@Entity({ tableName: "user_quests", repository: () => UserQuestRepository })
@Unique({ properties: ["user", "quest", "createdAt"] })
export class UserQuest extends BaseEntity {
  [EntityRepositoryType]?: UserQuestRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @ManyToOne(() => User, { joinColumn: "user_key" })
  user!: Rel<User>;

  @ManyToOne(() => Quest, { joinColumn: "quest_id" })
  quest!: Rel<Quest>;

  @Property({ name: "current_count", type: "int", default: 0 })
  currentCount: Opt<number> = 0;

  @Property({ name: "completed_at", type: "datetime", nullable: true })
  completedAt?: Opt<Date | null>;
}
