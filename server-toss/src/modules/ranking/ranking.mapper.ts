import { Ranking } from "./ranking.entity";
import type { PodiumItem, RankingListItem } from "./types/ranking.type";

export const mapRankingToPodiumItem = (ranking: Ranking): PodiumItem => {
  return {
    name: ranking.name,
    score: ranking.score,
  };
};

export const mapRankingToRankingListItem = (
  ranking: Ranking,
  index: number,
  userKey?: number,
): RankingListItem => {
  return {
    name: ranking.name,
    score: ranking.score,
    userKey: ranking.userKey,
    drawingId: ranking.drawingId.toString(),
    rank: index + 1,
    isMe: userKey !== undefined && ranking.userKey === userKey,
  };
};
