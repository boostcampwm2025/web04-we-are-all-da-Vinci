import { z } from "zod";

const RgbChannel = z.number().int().min(0).max(255);

export const StrokeSchema = z.object({
  points: z
    .tuple([z.array(z.number()), z.array(z.number())])
    .refine(([xPoints, yPoints]) => xPoints.length === yPoints.length, {
      message: "x 좌표와 y 좌표 배열의 길이가 같아야 해요",
    }),
  color: z.tuple([RgbChannel, RgbChannel, RgbChannel]),
});
export type Stroke = z.infer<typeof StrokeSchema>;

export const SimilarityResponseSchema = z.object({
  score: z.number().min(0).max(100),
  shapeSimilarity: z.number().min(0).max(100),
  strokeMatchSimilarity: z.number().min(0).max(100),
  penalty: z.number().min(0).max(100),
});
export type SimilarityResponse = z.infer<typeof SimilarityResponseSchema>;

export const SubmitStrokesRequestSchema = z.object({
  strokes: z.array(StrokeSchema),
});
export type SubmitStrokesRequest = z.infer<typeof SubmitStrokesRequestSchema>;

export const PromptResponseSchema = z.object({
  promptId: z.number().int().positive(),
  strokes: z.array(StrokeSchema),
});
export type PromptResponse = z.infer<typeof PromptResponseSchema>;

export const SubmitDrawingRequestSchema = z.object({
  userKey: z.string().regex(/^\d+$/),
  strokes: z.array(StrokeSchema),
});
export type SubmitDrawingRequest = z.infer<typeof SubmitDrawingRequestSchema>;

export const SubmitDrawingResponseSchema = z.object({
  drawingId: z.number().int().positive(),
  similarity: SimilarityResponseSchema,
});
export type SubmitDrawingResponse = z.infer<typeof SubmitDrawingResponseSchema>;
