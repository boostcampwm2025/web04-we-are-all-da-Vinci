import { z } from "zod";

export const RankingSimilaritySchema = z.object({
  score: z.number().min(0).max(100),
  strokeCountSimilarity: z.number().min(0).max(100),
  shapeSimilarity: z.number().min(0).max(100),
  penalty: z.number().min(0).max(100),
});

export type RankingSimilarity = z.infer<typeof RankingSimilaritySchema>;

export const Top3RankingItemSchema = z.object({
  name: z.string().max(10),
  score: z.number().min(0).max(100),
});

export type Top3RankingItem = z.infer<typeof Top3RankingItemSchema>;

export const Top3RankingResponseSchema = z.array(Top3RankingItemSchema);

export type Top3RankingResponse = z.infer<typeof Top3RankingResponseSchema>;

export const Top100RankingItemSchema = z.object({
  name: z.string().max(10),
  score: z.number().min(0).max(100),
  userId: z.string().regex(/^\d+$/),
  drawingId: z.string().regex(/^\d+$/),
  rank: z.number().min(1),
  isMe: z.boolean(),
});

export type Top100RankingItem = z.infer<typeof Top100RankingItemSchema>;

export const Top100RankingResponseSchema = z.array(Top100RankingItemSchema);

export type Top100RankingResponse = z.infer<typeof Top100RankingResponseSchema>;

export const MyRankingSuccessResponseSchema = z.object({
  state: z.literal("FOUND"),
  ranking: z.object({
    rank: z.number().int().min(1),
    score: z.number().min(0).max(100),
  }),
});

export type MyRankingSuccessResponse = z.infer<
  typeof MyRankingSuccessResponseSchema
>;

export const MyRankingNotSubmittedResponseSchema = z.object({
  state: z.literal("NOT_SUBMITTED"),
  message: z.literal("NOT_SUBMITTED"),
});

export type MyRankingNotSubmittedResponse = z.infer<
  typeof MyRankingNotSubmittedResponseSchema
>;

export const MyRankingResponseSchema = z.union([
  MyRankingSuccessResponseSchema,
  MyRankingNotSubmittedResponseSchema,
]);

export type MyRankingResponse = z.infer<typeof MyRankingResponseSchema>;
