export interface Stroke {
  points: [number[], number[]];
  color: [number, number, number];
}

export interface PlayerResult {
  socketId: string;
  nickname: string;
  similarity: number;
}

export interface RoundResultEntry extends PlayerResult {
  strokes: Stroke[];
}

export interface GameResultEntry {
  socketId: string;
  nickname: string;
  score: number;
}
