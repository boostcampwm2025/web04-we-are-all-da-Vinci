import type { SimilarityResponse, Stroke } from "@toss/shared";

interface MyRankingFoundResponse {
  state: "FOUND";
  ranking: {
    rank: number;
    score: number;
  };
}

interface MyRankingNotSubmittedResponse {
  state: "NOT_SUBMITTED";
  message: string;
}

type MyRankingResponse = MyRankingFoundResponse | MyRankingNotSubmittedResponse;

interface RankingListItem {
  userKey: number;
  nickname: string;
  drawingId: string;
  rank: number;
  score: number;
  isMe: boolean;
  strokes: Stroke[];
  similarity: SimilarityResponse;
}

export type { MyRankingResponse, RankingListItem };
