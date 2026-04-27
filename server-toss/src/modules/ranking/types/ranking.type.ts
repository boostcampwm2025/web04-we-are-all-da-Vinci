import { z } from "zod";

export const RankingSimilaritySchema = z.object({
  score: z.number().min(0).max(100),
  strokeMatchSimilarity: z.number().min(0).max(100),
  shapeSimilarity: z.number().min(0).max(100),
  penalty: z.number().min(0).max(100),
});

export type RankingSimilarity = z.infer<typeof RankingSimilaritySchema>;

export const PodiumItemSchema = z.object({
  name: z.string().max(10),
  score: z.number().min(0).max(100),
});

export type PodiumItem = z.infer<typeof PodiumItemSchema>;

export const PodiumResponseSchema = z.array(PodiumItemSchema);

export type PodiumResponse = z.infer<typeof PodiumResponseSchema>;

export const RankingListItemSchema = z.object({
  name: z.string().max(10),
  score: z.number().min(0).max(100),
  userId: z.string().regex(/^\d+$/),
  drawingId: z.string().regex(/^\d+$/),
  rank: z.number().min(1),
  isMe: z.boolean(),
});

export type RankingListItem = z.infer<typeof RankingListItemSchema>;

export const RankingListResponseSchema = z.array(RankingListItemSchema);

export type RankingListResponse = z.infer<typeof RankingListResponseSchema>;

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
