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
  similarity: number;
  strokeCountSimilarity: number;
  strokeMatchSimilarity: number;
  shapeSimilarity: number;
}
