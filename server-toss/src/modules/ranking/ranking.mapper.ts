import type { SimilarityResponse, Stroke } from "@toss/shared";
import { Ranking } from "./ranking.entity";
import type { PodiumItem, RankingListItem } from "./types/ranking.type";

const buildFallbackSimilarity = (score: number): SimilarityResponse => ({
  score,
  strokeMatchSimilarity: 0,
  shapeSimilarity: 0,
  penalty: 0,
});

export const mapRankingToPodiumItem = (ranking: Ranking): PodiumItem => {
  return {
    nickname: ranking.nickname,
    score: ranking.score,
  };
};

export const mapRankingToRankingListItem = (
  ranking: Ranking,
  index: number,
  userKey?: number,
): Omit<RankingListItem, "strokes" | "similarity"> => {
  return {
    nickname: ranking.nickname,
    score: ranking.score,
    userKey: ranking.userKey,
    drawingId: ranking.drawingId.toString(),
    rank: index + 1,
    isMe: userKey !== undefined && ranking.userKey === userKey,
  };
};

export const mapRankingToRankingGalleryItem = (
  ranking: Ranking,
  drawing: { strokes: string; similarity: string } | undefined,
  index: number,
  userKey?: number,
): RankingListItem => {
  return {
    nickname: ranking.nickname,
    score: ranking.score,
    userKey: ranking.userKey,
    drawingId: ranking.drawingId.toString(),
    rank: index + 1,
    isMe: userKey !== undefined && ranking.userKey === userKey,
    strokes: JSON.parse(drawing?.strokes ?? ranking.strokes) as Stroke[],
    similarity: drawing
      ? (JSON.parse(drawing.similarity) as SimilarityResponse)
      : buildFallbackSimilarity(ranking.score),
  };
};
