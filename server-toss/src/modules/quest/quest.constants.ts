import { ObjectiveType } from "./entity/quest.entity";

export const DAILY_RANDOM_COUNT = 2;
export const WEEKLY_RANDOM_COUNT = 1;

/** 튜토리얼 퀘스트의 고정 createdAt — 사용자당 1행 보장 */
export const TUTORIAL_EPOCH = new Date("2026-01-01T00:00:00.000Z");

/** POST /quests/action의 actionType → ObjectiveType 매핑 */
export const ACTION_TYPE_TO_OBJECTIVE: Record<string, ObjectiveType> = {
  visit_ranking: ObjectiveType.VISIT_RANKING,
  visit_podium: ObjectiveType.VISIT_PODIUM,
  visit_quest_tab: ObjectiveType.VISIT_QUEST_TAB,
  visit_drawing_detail: ObjectiveType.VISIT_DRAWING_DETAIL,
  share: ObjectiveType.SHARE,
  retry: ObjectiveType.RETRY,
};
