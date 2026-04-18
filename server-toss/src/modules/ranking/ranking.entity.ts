import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { EntityRepositoryType } from "@mikro-orm/core";
import { BaseEntity } from "src/common/base.entity";
import { RankingRepository } from "./ranking.repository";

@Entity({ tableName: "rankings", repository: () => RankingRepository })
export class Ranking extends BaseEntity {
  [EntityRepositoryType]?: RankingRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ type: "varchar(10)", length: 10 })
  name!: string;

  @Property({ fieldName: "strokes", type: "text" })
  strokes!: string;

  @Property({ fieldName: "total_similarity", type: "double" })
  totalSimilarity!: number;

  @Property({ fieldName: "user_id", type: "bigint" })
  userId!: bigint;

  @Property({ fieldName: "drawing_id", type: "bigint" })
  drawingId!: bigint;
}
