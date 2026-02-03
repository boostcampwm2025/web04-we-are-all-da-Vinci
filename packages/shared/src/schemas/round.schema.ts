import { z } from 'zod';
import { StrokeSchema, SimilaritySchema } from './base.schema.js';
import { RoundResultEntrySchema, GameResultEntrySchema, PlayerScoreSchema } from './result.schema.js';

export const RoomPromptSchema = z.object({
  promptStrokes: z.array(StrokeSchema),
});

export const RoomTimerSchema = z.object({
  timeLeft: z.number().int().min(0),
});

export const RoomRoundReplaySchema = z.object({
  rankings: z.array(RoundResultEntrySchema),
  promptStrokes: z.array(StrokeSchema),
});

export const RoomRoundStandingSchema = z.object({
  rankings: z.array(PlayerScoreSchema),
});

export const HighlightSchema = z.object({
  promptStrokes: z.array(StrokeSchema),
  playerStrokes: z.array(StrokeSchema),
  similarity: SimilaritySchema,
});

export const RoomGameEndSchema = z.object({
  finalRankings: z.array(GameResultEntrySchema),
  highlight: HighlightSchema,
});

export const RoomLeaderboardSchema = z.object({
  rankings: z.array(
    z.object({
      socketId: z.string(),
      nickname: z.string(),
      profileId: z.string(),
      similarity: z.number(),
    }),
  ),
});

export const UserWaitlistSchema = z.object({
  currentRound: z.number().int().min(0),
  totalRounds: z.number().int().min(1),
});

export const RoomKickedSchema = z.object({
  kickedPlayer: z.object({
    socketId: z.string(),
    nickname: z.string(),
  }),
});

export const ErrorResponseSchema = z.object({
  message: z.string(),
});
