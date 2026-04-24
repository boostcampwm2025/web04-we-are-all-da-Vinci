import { EntityManager, QueryOrder } from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { getSeoulDayRange } from "src/common/time.util";
import {
  type MyRankingResponse,
  type Top100RankingResponse,
  type Top3RankingResponse,
} from "./types/ranking.type";
import { RankingRepository } from "./ranking.repository";
import { mapRankingToTop100Item, mapRankingToTop3Item } from "./ranking.mapper";
import { Ranking } from "./ranking.entity";

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Ranking)
    private readonly rankingRepository: RankingRepository,
    private readonly em: EntityManager,
  ) {}

  async findTop3(): Promise<Top3RankingResponse> {
    const rankings = await this.rankingRepository.findTop(3);

    return rankings.map(mapRankingToTop3Item);
  }

  async findTop100(userId?: bigint): Promise<Top100RankingResponse> {
    const rankings = await this.rankingRepository.findTop(100);

    return rankings.map((ranking, index) =>
      mapRankingToTop100Item(ranking, index, userId),
    );
  }

  async findMyRanking(userId: bigint): Promise<MyRankingResponse> {
    const { start, end } = getSeoulDayRange();

    const drawings = await this.em.find(
      Drawing,
      {
        createdAt: {
          $gte: start,
          $lt: end,
        },
      },
      {
        populate: ["user"],
        orderBy: [
          {
            score: QueryOrder.DESC,
            createdAt: QueryOrder.ASC,
            user: { name: QueryOrder.ASC },
          },
        ],
      },
    );

    const rankingIndex = drawings.findIndex((drawing) => {
      return drawing.user.id === userId;
    });

    if (rankingIndex < 0) {
      return {
        state: "NOT_SUBMITTED",
        message: "NOT_SUBMITTED",
      };
    }

    const ranking = drawings[rankingIndex];
    return {
      state: "FOUND",
      ranking: {
        rank: rankingIndex + 1,
        score: ranking.score,
      },
    };
  }
}
