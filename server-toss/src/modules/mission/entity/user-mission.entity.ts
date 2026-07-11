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
import { Mission } from "./mission.entity";
import { UserMissionRepository } from "../repository/user-mission.repository";

@Entity({ tableName: "user_missions", repository: () => UserMissionRepository })
@Unique({ properties: ["user", "createdAt", "mission"] })
export class UserMission extends BaseEntity {
  [EntityRepositoryType]?: UserMissionRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @ManyToOne(() => User, { joinColumn: "user_key" })
  user!: Rel<User>;

  @ManyToOne(() => Mission, { joinColumn: "mission_id" })
  mission!: Rel<Mission>;

  @Property({ name: "current_count", type: "int", default: 0 })
  currentCount: Opt<number> = 0;

  @Property({ name: "completed_at", type: "datetime", nullable: true })
  completedAt?: Opt<Date | null>;

  /** 마지막으로 진행(카운트 증가)된 시각. 진행 케이던스 게이트(ProgressLimit) 판단용. */
  @Property({ name: "last_progressed_at", type: "datetime", nullable: true })
  lastProgressedAt?: Opt<Date | null>;

  /** 도전 미션 전용: Mission.requiredCount 오버라이드. null이면 마스터 값 사용. */
  @Property({ name: "required_count", type: "int", nullable: true })
  requiredCount?: Opt<number | null>;

  /** 도전 미션 전용: 완료 횟수 (현재 티어 = level + 1). */
  @Property({ name: "level", type: "int", default: 0 })
  level: Opt<number> = 0;
}
