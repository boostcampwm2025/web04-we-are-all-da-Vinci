import { z } from 'zod';

// 게임 드로잉 제출 요청 (client-toss → server-toss)
export const SubmitDrawingRequestSchema = z.object({
  roomId: z.string(),
  strokeData: z.unknown(), // 향후 @davinci/similarity의 PreprocessedStrokeData 타입으로 구체화
});
export type SubmitDrawingRequest = z.infer<typeof SubmitDrawingRequestSchema>;

// 유사도 결과 응답 (server-toss → client-toss)
export const SimilarityResultSchema = z.object({
  score: z.number().min(0).max(100),
  round: z.number(),
});
export type SimilarityResult = z.infer<typeof SimilarityResultSchema>;
