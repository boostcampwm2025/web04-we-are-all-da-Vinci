import { z } from 'zod';
import { SimilaritySchema, StrokeSchema } from './base.schema.js';

export const PlayerResultSchema = z.object({
  socketId: z.string(),
  nickname: z.string(),
  profileId: z.string(),
  similarity: SimilaritySchema,
});

export const RoundResultEntrySchema = PlayerResultSchema.extend({
  strokes: z.array(StrokeSchema),
});

export const GameResultEntrySchema = z.object({
  socketId: z.string(),
  nickname: z.string(),
  profileId: z.string(),
  score: z.number().min(0),
});

export const FinalResultSchema = z.object({
  socketId: z.string(),
  nickname: z.string(),
  profileId: z.string(),
  score: z.number().min(0),
});

export const RankingEntrySchema = z.object({
  socketId: z.string(),
  nickname: z.string(),
  profileId: z.string(),
  similarity: z.number().min(0).max(100),
  rank: z.number().int().min(1),
  previousRank: z.number().int().min(1).nullable(),
});

export const PlayerScoreSchema = z.object({
  socketId: z.string(),
  nickname: z.string(),
  profileId: z.string(),
  score: z.number().min(0),
});

export const LeaderboardEntrySchema = z.object({
  socketId: z.string(),
  nickname: z.string(),
  profileId: z.string(),
  similarity: z.number().min(0).max(100),
});
