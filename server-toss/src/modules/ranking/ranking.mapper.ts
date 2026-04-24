import { Ranking } from "./ranking.entity";
import type { PodiumItem, RankingListItem } from "./types/ranking.type";

const toStringId = (value: bigint) => {
  return value.toString();
};

export const mapRankingToPodiumItem = (ranking: Ranking): PodiumItem => {
  return {
    name: ranking.name,
    score: ranking.score,
  };
};

export const mapRankingToRankingListItem = (
  ranking: Ranking,
  index: number,
  userId?: bigint,
): RankingListItem => {
  return {
    name: ranking.name,
    score: ranking.score,
    userId: toStringId(ranking.userId),
    drawingId: toStringId(ranking.drawingId),
    rank: index + 1,
    isMe: userId !== undefined && ranking.userId === userId,
  };
};
