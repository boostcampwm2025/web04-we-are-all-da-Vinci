import type { Opt } from "@mikro-orm/core";
import { EntityRepositoryType } from "@mikro-orm/core";
import {
  Entity,
  Enum,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { MissionRepository } from "../repository/mission.repository";

export enum MissionPeriod {
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
  MISSION_COMPLETED = "mission_completed",
  VISIT_RANKING = "visit_ranking",
  VISIT_MISSION_TAB = "visit_mission_tab",
  VISIT_DRAWING_DETAIL = "visit_drawing_detail",
  SHARE = "share",
  TUTORIAL_COMPLETED = "tutorial_completed",
}

export enum RewardType {
  POINT = "point",
  CHANCE = "chance",
}

/**
 * 진행 케이던스(rate limit) — 활성 미션이 얼마나 자주 진행될 수 있는지.
 * 할당/리셋 주기(MissionPeriod)와는 별개의 축이다.
 * none = 매 이벤트마다 진행, day/week/month = 해당 주기당 1회만 진행.
 */
export enum ProgressPeriod {
  NONE = "none",
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
}

@Entity({ tableName: "missions", repository: () => MissionRepository })
export class Mission extends BaseEntity {
  [EntityRepositoryType]?: MissionRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ name: "title", type: "varchar(50)" })
  title!: string;

  @Enum({ items: () => MissionPeriod, name: "period" })
  period!: MissionPeriod;

  @Property({ name: "is_fixed", type: "boolean" })
  isFixed!: boolean;

  @Enum({ items: () => ObjectiveType, name: "objective_type" })
  objectiveType!: ObjectiveType;

  @Property({ name: "required_count", type: "int" })
  requiredCount!: number;

  @Property({ name: "threshold", type: "int", nullable: true })
  threshold?: Opt<number | null>;

  @Enum({ items: () => RewardType, name: "reward_type" })
  rewardType!: RewardType;

  @Property({ name: "reward_amount", type: "int" })
  rewardAmount!: number;

  @Property({ name: "category", type: "varchar(20)", nullable: true })
  category?: Opt<string | null>;

  @Enum({
    items: () => ProgressPeriod,
    name: "progress_period",
    default: ProgressPeriod.NONE,
  })
  progressPeriod: ProgressPeriod = ProgressPeriod.NONE;
}
