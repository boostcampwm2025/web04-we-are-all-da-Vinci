import { z } from "zod";

// 퀘스트 단건
export const QuestItemSchema = z.object({
  userQuestId: z.number().int(),
  questId: z.number().int(),
  title: z.string(),
  currentCount: z.number().int().min(0),
  requiredCount: z.number().int().min(1),
  rewardType: z.enum(["point", "chance"]),
  rewardAmount: z.number().int().min(0),
});
export type QuestItem = z.infer<typeof QuestItemSchema>;

// GET /quests/me 응답
export const MyQuestsResponseSchema = z.object({
  dailyQuests: z.array(QuestItemSchema),
  weeklyQuests: z.array(QuestItemSchema),
});
export type MyQuestsResponse = z.infer<typeof MyQuestsResponseSchema>;
