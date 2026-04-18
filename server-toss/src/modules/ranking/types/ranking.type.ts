import { z } from "zod";

export const RankingSimilaritySchema = z.object({
  similarity: z.number().min(0).max(100),
  strokeCountSimilarity: z.number().min(0).max(100),
  strokeMatchSimilarity: z.number().min(0).max(100),
  shapeSimilarity: z.number().min(0).max(100),
});

export type RankingSimilarity = z.infer<typeof RankingSimilaritySchema>;

export const Top3RankingItemSchema = z.object({
  name: z.string().max(10),
  similarity: z.number().min(0).max(100),
});

export type Top3RankingItem = z.infer<typeof Top3RankingItemSchema>;

export const Top3RankingResponseSchema = z.array(Top3RankingItemSchema);

export type Top3RankingResponse = z.infer<typeof Top3RankingResponseSchema>;

export const Top100RankingItemSchema = z.object({
  name: z.string().max(10),
  similarity: z.number().min(0).max(100),
  userId: z.string().regex(/^\d+$/),
  drawingId: z.string().regex(/^\d+$/),
});

export type Top100RankingItem = z.infer<typeof Top100RankingItemSchema>;

export const Top100RankingResponseSchema = z.array(Top100RankingItemSchema);

export type Top100RankingResponse = z.infer<typeof Top100RankingResponseSchema>;
