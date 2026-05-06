import { EntityRepositoryType } from "@mikro-orm/core";
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { RankingRepository } from "./ranking.repository";

@Entity({ tableName: "rankings", repository: () => RankingRepository })
@Index({
  name: "idx_ranking_score_submit_nickname",
  properties: ["score", "submittedAt", "nickname"],
  columns: [
    { name: "score", sort: "DESC" },
    { name: "submittedAt", sort: "ASC" },
    { name: "nickname", sort: "ASC" },
  ],
})
export class Ranking extends BaseEntity {
  [EntityRepositoryType]?: RankingRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ type: "varchar(20)", length: 20 })
  nickname!: string;

  @Property({ fieldName: "strokes", type: "text" })
  strokes!: string;

  @Property({ fieldName: "score", type: "double" })
  score!: number;

  @Property({ fieldName: "user_key", type: "integer" })
  userKey!: number;

  @Property({ fieldName: "drawing_id", type: "bigint" })
  drawingId!: bigint;

  @Property({ fieldName: "submitted_at", type: "datetime" })
  submittedAt!: Date;
}
