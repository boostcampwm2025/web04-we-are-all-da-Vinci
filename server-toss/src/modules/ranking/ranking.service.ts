import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
import {
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
  ) {}

  async findTop3(): Promise<Top3RankingResponse> {
    const rankings = await this.rankingRepository.findTop(3);

    return rankings.map(mapRankingToTop3Item);
  }

  async findTop100(): Promise<Top100RankingResponse> {
    const rankings = await this.rankingRepository.findTop(100);

    return rankings.map(mapRankingToTop100Item);
  }
}
