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

// 튜토리얼 카테고리
export const TutorialCategorySchema = z.object({
  category: z.string(),
  label: z.string(),
  rewardAmount: z.number().int(),
  isCompleted: z.boolean(),
  quests: z.array(QuestItemSchema),
});
export type TutorialCategory = z.infer<typeof TutorialCategorySchema>;

// GET /quests/me 응답
export const MyQuestsResponseSchema = z.object({
  dailyQuests: z.array(QuestItemSchema),
  weeklyQuests: z.array(QuestItemSchema),
  tutorialCategories: z.array(TutorialCategorySchema),
});
export type MyQuestsResponse = z.infer<typeof MyQuestsResponseSchema>;

// POST /quests/action 요청
export const QuestActionSchema = z.object({
  actionType: z.enum([
    "visit_ranking",
    "visit_quest_tab",
    "visit_drawing_detail",
    "share",
  ]),
});
export type QuestAction = z.infer<typeof QuestActionSchema>;
