export interface MyRankingFoundResponse {
  state: "FOUND";
  ranking: {
    rank: number;
    score: number;
  };
}

export interface MyRankingNotSubmittedResponse {
  state: "NOT_SUBMITTED";
  message: string;
}

export type MyRankingResponse =
  | MyRankingFoundResponse
  | MyRankingNotSubmittedResponse;

export interface RankingListItem {
  userId: string;
  name: string;
  drawingId: string;
  rank: number;
  score: number;
  isMe: boolean;
}
