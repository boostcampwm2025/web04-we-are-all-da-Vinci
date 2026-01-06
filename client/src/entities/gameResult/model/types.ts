export interface PlayerResult {
  rank: number;
  nickname: string;
  score: number;
  isCurrentUser?: boolean;
  avatar?: string;
}

export interface GameResultData {
  players: PlayerResult[];
  totalRounds: number;
}
