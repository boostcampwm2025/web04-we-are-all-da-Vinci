import { BaseEntity } from "@mikro-orm/core";
import {
  Entity,
  Enum,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "quests" })
export class Quest extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ name: "title", type: "varchar(50)" })
  title!: string;

  @Enum({ items: () => QuestType, name: "quest_type" })
  type!: QuestType;

  @Enum({ items: () => ObjectiveType, name: "objective_type" })
  objectiveType!: ObjectiveType;

  @Property({ name: "required_count", type: "int" })
  requiredCount!: number;

  @Enum({ items: () => RewardType, name: "reward_type" })
  rewardType!: RewardType;

  @Property({ name: "reward_amount", type: "int" })
  rewardAmount!: number;
}
export enum RewardType {
  POINT = "point",
  CHANCE = "chance",
}

export enum ObjectiveType {
  SUBMIT = "submit",
  SCORE = "score",
  QUEST_COMPLETED = "quest_completed",
}

export enum QuestType {
  DAILY_FIXED = "daily_fixed",
  DAILY_RANDOM = "daily_random",
  WEEKLY_FIXED = "weekly_fixed",
  WEEKLY_RANDOM = "weekly_random",
}
