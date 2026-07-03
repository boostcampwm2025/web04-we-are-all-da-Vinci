import { z } from "zod";

// 미션 단건
export const MissionItemSchema = z.object({
  userMissionId: z.number().int(),
  missionId: z.number().int(),
  title: z.string(),
  objectiveType: z.string(),
  currentCount: z.number().int().min(0),
  requiredCount: z.number().int().min(1),
  rewardType: z.enum(["point", "chance"]),
  rewardAmount: z.number().int().min(0),
});
export type MissionItem = z.infer<typeof MissionItemSchema>;

// 튜토리얼 카테고리
export const TutorialCategorySchema = z.object({
  category: z.string(),
  label: z.string(),
  rewardAmount: z.number().int().min(0),
  isCompleted: z.boolean(),
  missions: z.array(MissionItemSchema),
});
export type TutorialCategory = z.infer<typeof TutorialCategorySchema>;

// GET /missions/me 응답
export const MyMissionsResponseSchema = z.object({
  dailyMissions: z.array(MissionItemSchema),
  weeklyMissions: z.array(MissionItemSchema),
  tutorialCategories: z.array(TutorialCategorySchema),
});
export type MyMissionsResponse = z.infer<typeof MyMissionsResponseSchema>;

// GET /missions/today 응답 (대시보드 카드용 경량 — 오늘의 일일 미션만)
export const TodayMissionItemSchema = z.object({
  missionId: z.number().int(),
  title: z.string(),
  rewardAmount: z.number().int().min(0),
  done: z.boolean(),
});
export type TodayMissionItem = z.infer<typeof TodayMissionItemSchema>;

export const TodayMissionsResponseSchema = z.object({
  missions: z.array(TodayMissionItemSchema),
});
export type TodayMissionsResponse = z.infer<typeof TodayMissionsResponseSchema>;

// POST /missions/action 요청
export const MissionActionSchema = z.object({
  actionType: z.enum([
    "visit_ranking",
    "visit_mission_tab",
    "visit_drawing_detail",
    "share",
  ]),
});
export type MissionAction = z.infer<typeof MissionActionSchema>;
