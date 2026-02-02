import { z } from 'zod';
import { SimilaritySchema, StrokeSchema } from './base.schema.js';

export const UserScoreSchema = z.object({
  roomId: z.string(),
  similarity: z.number().min(0).max(100),
});

export const UserDrawingSchema = z.object({
  roomId: z.string(),
  similarity: SimilaritySchema,
  strokes: z.array(StrokeSchema),
});

export const UserPracticeSchema = z.object({
  roomId: z.string(),
});
