import type { Opt } from "@mikro-orm/core";
import { EntityRepositoryType } from "@mikro-orm/core";
import {
  Entity,
  Enum,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { QuestRepository } from "../repository/quest.repository";

export enum QuestPeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
}

export enum ObjectiveType {
  SUBMIT = "submit",
  SCORE = "score",
  QUEST_COMPLETED = "quest_completed",
}

export enum RewardType {
  POINT = "point",
  CHANCE = "chance",
}

@Entity({ tableName: "quests", repository: () => QuestRepository })
export class Quest extends BaseEntity {
  [EntityRepositoryType]?: QuestRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ name: "title", type: "varchar(50)" })
  title!: string;

  @Enum({ items: () => QuestPeriod, name: "period" })
  period!: QuestPeriod;

  @Property({ name: "is_fixed", type: "boolean" })
  isFixed!: boolean;

  @Enum({ items: () => ObjectiveType, name: "objective_type" })
  objectiveType!: ObjectiveType;

  @Property({ name: "required_count", type: "int" })
  requiredCount!: number;

  @Property({ name: "threshold", type: "int", nullable: true })
  threshold?: Opt<number>;

  @Enum({ items: () => RewardType, name: "reward_type" })
  rewardType!: RewardType;

  @Property({ name: "reward_amount", type: "int" })
  rewardAmount!: number;
}
