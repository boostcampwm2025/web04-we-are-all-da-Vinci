import { Ranking } from "./ranking.entity";
import {
  type Top100RankingItem,
  type Top3RankingItem,
} from "./types/ranking.type";

const toStringId = (value: bigint) => {
  return value.toString();
};

export const mapRankingToTop3Item = (ranking: Ranking): Top3RankingItem => {
  return {
    name: ranking.name,
    similarity: ranking.totalSimilarity,
  };
};

export const mapRankingToTop100Item = (ranking: Ranking): Top100RankingItem => {
  return {
    name: ranking.name,
    similarity: ranking.totalSimilarity,
    userId: toStringId(ranking.userId),
    drawingId: toStringId(ranking.drawingId),
  };
};
