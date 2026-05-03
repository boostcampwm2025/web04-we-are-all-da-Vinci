import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
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
  ) {}

  async findPodium(): Promise<PodiumResponse> {
    const rankings = await this.rankingRepository.findTop(3);

    return rankings.map(mapRankingToPodiumItem);
  }

  async findRankingList(userId?: bigint): Promise<RankingListResponse> {
    const [rankings, updatedAt] = await Promise.all([
      this.rankingRepository.findTop(100),
      this.rankingRepository.findLatestUpdatedAt(),
    ]);

    return {
      updatedAt: (updatedAt ?? new Date()).toISOString(),
      rankings: rankings.map((ranking, index) =>
        mapRankingToRankingListItem(ranking, index, userId),
      ),
    };
  }

  async findMyRanking(userId: bigint): Promise<MyRankingResponse> {
    const result = await this.rankingRepository.findMyRanking(userId);

    if (!result) {
      return {
        state: "NOT_SUBMITTED",
        message: "NOT_SUBMITTED",
      };
    }

    return {
      state: "FOUND",
      ranking: result,
    };
  }
}
