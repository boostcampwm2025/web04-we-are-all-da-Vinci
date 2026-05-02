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
    const ranking = await this.findOne(
      {},
      {
        orderBy: {
          updatedAt: QueryOrder.DESC,
        },
      },
    );

    return ranking?.createdAt ?? null;
  }

  async findMyRanking(userId: bigint) {
    const qb = this.createQueryBuilder("r");

    const ranking = await qb
      .select([
        "r.score",
        sql`row_number() over(order by score DESC, submittedAt ASC, name ASC)`.as(
          "rank",
        ),
      ])
      .where({ "r.userId": userId })
      .execute<{ rank: number; score: number }[]>();

    if (ranking.length < 1) return null;
    return ranking[0];
  }
}
