import { Ranking } from "./ranking.entity";
import {
  type Top3RankingItem,
  type Top100RankingItem,
} from "./types/ranking.type";

const toStringId = (value: bigint) => {
  return value.toString();
};

export const mapRankingToTop3Item = (ranking: Ranking): Top3RankingItem => {
  return {
    name: ranking.name,
    score: ranking.score,
  };
};

export const mapRankingToTop100Item = (
  ranking: Ranking,
  index: number,
  userId?: bigint,
): Top100RankingItem => {
  return {
    name: ranking.name,
    score: ranking.score,
    userId: toStringId(ranking.userId),
    drawingId: toStringId(ranking.drawingId),
    rank: index + 1,
    isMe: userId !== undefined && ranking.userId === userId,
  };
};
