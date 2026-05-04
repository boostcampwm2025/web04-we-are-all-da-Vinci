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
  name: string;
  drawingId: string;
  rank: number;
  score: number;
  isMe: boolean;
}

export type {
  MyRankingFoundResponse,
  MyRankingNotSubmittedResponse,
  MyRankingResponse,
  RankingListItem,
};
