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
  TUTORIAL = "tutorial",
}

export enum ObjectiveType {
  SUBMIT = "submit",
  SCORE = "score",
  PENALTY = "penalty",
  DAILY_SUBMIT = "daily_submit",
  DAILY_SCORE = "daily_score",
  QUEST_COMPLETED = "quest_completed",
  VISIT_RANKING = "visit_ranking",
  VISIT_QUEST_TAB = "visit_quest_tab",
  VISIT_DRAWING_DETAIL = "visit_drawing_detail",
  SHARE = "share",
  TUTORIAL_COMPLETED = "tutorial_completed",
}

export enum RewardType {
  POINT = "point",
  CHANCE = "chance",
}

/**
 * 진행 케이던스(rate limit) — 활성 퀘스트가 얼마나 자주 진행될 수 있는지.
 * 할당/리셋 주기(QuestPeriod)와는 별개의 축이다.
 * none = 매 이벤트마다 진행, day/week/month = 해당 주기당 1회만 진행.
 */
export enum ProgressPeriod {
  NONE = "none",
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
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

  @Property({ name: "category", type: "varchar(20)", nullable: true })
  category?: Opt<string>;

  @Enum({
    items: () => ProgressPeriod,
    name: "progress_period",
    default: ProgressPeriod.NONE,
  })
  progressPeriod: ProgressPeriod = ProgressPeriod.NONE;
}
