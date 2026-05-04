import {
  Entity,
  Index,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { EntityRepositoryType } from "@mikro-orm/core";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { RankingRepository } from "./ranking.repository";

@Entity({ tableName: "rankings", repository: () => RankingRepository })
@Index({
  name: "idx_ranking_score_submit_name",
  properties: ["score", "submittedAt", "name"],
  columns: [
    { name: "score", sort: "DESC" },
    { name: "submittedAt", sort: "ASC" },
    { name: "name", sort: "ASC" },
  ],
})
export class Ranking extends BaseEntity {
  [EntityRepositoryType]?: RankingRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ type: "varchar(10)", length: 10 })
  name!: string;

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
