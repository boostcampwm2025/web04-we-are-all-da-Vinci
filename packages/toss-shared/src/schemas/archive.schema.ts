import { z } from "zod";
import { SimilarityResponseSchema, StrokeSchema } from "./drawing.schema";

export const ArchiveDateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type ArchiveDateParam = z.infer<typeof ArchiveDateParamSchema>;

export const ArchiveSummaryResponseSchema = z.object({
  dates: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      drawingCount: z.number().int().min(0),
      bestScore: z.number().min(0).max(100),
      rank: z.number().int().min(1).nullable(),
      participantCount: z.number().int().min(1).nullable(),
    }),
  ),
  stats: z.object({
    totalDrawingCount: z.number().int().min(0),
    playDays: z.number().int().min(0),
    bestScore: z.number().min(0).max(100).nullable(),
    bestRank: z.number().int().min(1).nullable(),
  }),
});
export type ArchiveSummaryResponse = z.infer<
  typeof ArchiveSummaryResponseSchema
>;

export const ArchiveDayResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prompt: z
    .object({
      promptId: z.number().int().positive(),
      strokes: z.array(StrokeSchema),
    })
    .nullable(),
  ranking: z
    .object({
      rank: z.number().int().min(1),
      score: z.number().min(0).max(100),
      participantCount: z.number().int().min(1),
      drawingId: z.number().int().positive(),
    })
    .nullable(),
  drawings: z.array(
    z.object({
      drawingId: z.number().int().positive(),
      createdAt: z.iso.datetime(),
      strokes: z.array(StrokeSchema),
      similarity: SimilarityResponseSchema,
      isRankedDrawing: z.boolean(), // 랭킹에 올라간 그림인지 여부(즉 당일 최고점 그림인지)
    }),
  ),
});
export type ArchiveDayResponse = z.infer<typeof ArchiveDayResponseSchema>;
