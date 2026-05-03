import { EntityRepository, QueryOrder, sql } from "@mikro-orm/mysql";
import { Ranking } from "./ranking.entity";

export class RankingRepository extends EntityRepository<Ranking> {
  async findTop(limit: number): Promise<Ranking[]> {
    return await this.find(
      {},
      {
        limit,
        orderBy: [
          {
            score: QueryOrder.DESC,
            submittedAt: QueryOrder.ASC,
            name: QueryOrder.ASC,
          },
        ],
      },
    );
  }

  async findLatestUpdatedAt(): Promise<Date | null> {
    const [ranking] = await this.find(
      {},
      {
        limit: 1,
        orderBy: {
          updatedAt: QueryOrder.DESC,
        },
      },
    );

    return ranking?.createdAt ?? null;
  }

  async findMyRanking(userId: bigint) {
    const rankQuery = this.createQueryBuilder("r")
      .select([
        "r.score",
        "r.userId",
        sql`row_number() over(order by score DESC, submitted_at ASC, name ASC)`.as(
          "rank",
        ),
      ])
      .from(Ranking);

    const qb = this.createQueryBuilder("r");

    const ranking = await qb
      .select([sql`rq.score`, sql`rq.rank`.as("rank")])
      .with("rank_query", rankQuery)
      .where({ [sql`rq.user_id`]: userId })
      .from("rank_query", "rq")
      .execute<{ rank: number; score: number }[]>();

    if (ranking.length < 1) return null;
    return ranking[0];
  }
}
