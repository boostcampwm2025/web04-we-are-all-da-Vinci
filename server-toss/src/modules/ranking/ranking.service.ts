import { EntityManager, QueryOrder } from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { getSeoulDayRange } from "src/common/time.util";
import {
  type MyRankingResponse,
  type RankingListResponse,
  type PodiumResponse,
} from "./types/ranking.type";
import { RankingRepository } from "./ranking.repository";
import {
  mapRankingToRankingListItem,
  mapRankingToPodiumItem,
} from "./ranking.mapper";
import { Ranking } from "./ranking.entity";

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Ranking)
    private readonly rankingRepository: RankingRepository,
    private readonly em: EntityManager,
  ) {}

  async findPodium(): Promise<PodiumResponse> {
    const rankings = await this.rankingRepository.findTop(3);

    return rankings.map(mapRankingToPodiumItem);
  }

  async findRankingList(userId?: bigint): Promise<RankingListResponse> {
    const rankings = await this.rankingRepository.findTop(100);

    return rankings.map((ranking, index) =>
      mapRankingToRankingListItem(ranking, index, userId),
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
