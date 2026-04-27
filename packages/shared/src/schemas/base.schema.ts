import { z } from "zod";

// Point: 2D 좌표
export interface Point {
  x: number;
  y: number;
}

// Color: RGB 튜플
export const ColorSchema = z.tuple([
  z.number().int().min(0).max(255),
  z.number().int().min(0).max(255),
  z.number().int().min(0).max(255),
]);

// Stroke: 그림 획
export const StrokeSchema = z.object({
  points: z.tuple([z.array(z.number()), z.array(z.number())]),
  color: ColorSchema,
});

// Similarity: 유사도 결과
export const SimilaritySchema = z.object({
  score: z.number().min(0).max(100),
  strokeMatchSimilarity: z.number().min(0).max(100),
  shapeSimilarity: z.number().min(0).max(100),
  penalty: z.number().min(0).max(100),
});
