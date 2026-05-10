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
import { Drawing } from "../drawing/drawing.entity";
import { User } from "../user/user.entity";

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Ranking)
    private readonly rankingRepository: RankingRepository,
  ) {}

  async updateRanking(user: User, drawing: Drawing) {
    const existing = await this.rankingRepository.findByUserKey(user.userKey);

    if (!existing) {
      await this.rankingRepository.saveOne(user, drawing);
      return;
    }

    if (!existing.isBetterThan(drawing.score)) {
      return;
    }
    existing.update(
      drawing.id,
      drawing.strokes,
      drawing.score,
      drawing.createdAt,
    );
    await this.rankingRepository.getEntityManager().flush();
  }

  async findPodium(): Promise<PodiumResponse> {
    const rankings = await this.rankingRepository.findTop(3);

    return rankings.map(mapRankingToPodiumItem);
  }

  async findRankingList(userKey?: number): Promise<RankingListResponse> {
    const [rankings, updatedAt] = await Promise.all([
      this.rankingRepository.findTop(100),
      this.rankingRepository.findLatestUpdatedAt(),
    ]);

    return {
      updatedAt: (updatedAt ?? new Date()).toISOString(),
      rankings: rankings.map((ranking, index) =>
        mapRankingToRankingListItem(ranking, index, userKey),
      ),
    };
  }

  async findMyRanking(userKey: number): Promise<MyRankingResponse> {
    const result = await this.rankingRepository.findMyRanking(userKey);

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
