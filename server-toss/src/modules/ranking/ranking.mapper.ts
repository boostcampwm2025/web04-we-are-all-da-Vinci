import { Ranking } from "./ranking.entity";
import {
  RankingSimilaritySchema,
  type Top100RankingItem,
  type Top3RankingItem,
} from "./types/ranking.type";

const parseSimilarity = (similarity: string) => {
  return RankingSimilaritySchema.parse(JSON.parse(similarity));
};

const toStringId = (value: bigint) => {
  return value.toString();
};

export const mapRankingToTop3Item = (ranking: Ranking): Top3RankingItem => {
  const parsedSimilarity = parseSimilarity(ranking.similarity);

  return {
    name: ranking.name,
    similarity: parsedSimilarity.similarity,
  };
};

export const mapRankingToTop100Item = (ranking: Ranking): Top100RankingItem => {
  const parsedSimilarity = parseSimilarity(ranking.similarity);

  return {
    name: ranking.name,
    similarity: parsedSimilarity.similarity,
    userId: toStringId(ranking.userId),
    drawingId: toStringId(ranking.drawingId),
  };
};
