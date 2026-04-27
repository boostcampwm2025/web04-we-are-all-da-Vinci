import { z } from "zod";

export const StrokeSchema = z.object({
  points: z.tuple([z.array(z.number()), z.array(z.number())]),
  color: z.tuple([
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
  ]),
});

export type Stroke = z.infer<typeof StrokeSchema>;

export const SimilarityResponseSchema = z.object({
  score: z.number().min(0).max(100),
  strokeMatchSimilarity: z.number().min(0).max(100),
  shapeSimilarity: z.number().min(0).max(100),
  penalty: z.number().min(0).max(100),
});

export type SimilarityResponse = z.infer<typeof SimilarityResponseSchema>;
