import { z } from "zod";

export const PodiumItemSchema = z.object({
  nickname: z.string().max(20),
  score: z.number().min(0).max(100),
});
export type PodiumItem = z.infer<typeof PodiumItemSchema>;

export const PodiumResponseSchema = z.object({
  podium: z.array(PodiumItemSchema),
  /** 오늘(KST) 랭킹에 제출한 전체 참가자 수 */
  participantCount: z.number().int().min(0),
});
export type PodiumResponse = z.infer<typeof PodiumResponseSchema>;
