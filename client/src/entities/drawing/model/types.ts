export type Stroke = [number[], number[]]; // [xArray, yArray]

export type Point = {
  x: number;
  y: number;
};

export type SimilarityResult = {
  similarity: number; // 유사도 점수: 소수점 2자리까지
  grade: string; // S~D 랭크
  details: {
    strokeCountSimilarity: number;
    strokeMatchSimilarity: number;
    hullSimilarity: number;
  };
};