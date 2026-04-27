import { EntityRepository, QueryOrder } from "@mikro-orm/mysql";
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
}
