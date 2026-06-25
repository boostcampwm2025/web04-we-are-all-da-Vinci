import { EntityRepositoryType } from "@mikro-orm/core";
import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { DailyUserRankingRepository } from "./daily-user-ranking.repository";

@Entity({
  tableName: "daily_user_rankings",
  repository: () => DailyUserRankingRepository,
})
@Unique({
  name: "daily_user_rankings_date_user_unique",
  properties: ["rankingDate", "userKey"],
})
export class DailyUserRanking extends BaseEntity {
  [EntityRepositoryType]?: DailyUserRankingRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ fieldName: "ranking_date", type: "date" })
  rankingDate!: Date;

  @Property({ fieldName: "user_key", type: "integer", unsigned: true })
  userKey!: number;

  @Property({ type: "varchar(20)", length: 20 })
  nickname!: string;

  @Property({ fieldName: "drawing_id", type: "bigint" })
  drawingId!: bigint;

  @Property({ type: "double" })
  score!: number;

  @Property({ type: "integer", unsigned: true })
  rank!: number;

  @Property({
    fieldName: "participant_count",
    type: "integer",
    unsigned: true,
  })
  participantCount!: number;

  @Property({ fieldName: "submitted_at", type: "datetime" })
  submittedAt!: Date;
}
