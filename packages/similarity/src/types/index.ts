export interface Point {
  x: number;
  y: number;
}

export type Color = [number, number, number];

export interface Stroke {
  points: [number[], number[]];
  color: Color;
}

export interface Similarity {
  score: number;
  strokeMatchSimilarity: number;
  shapeSimilarity: number;
  penalty: number;
}
