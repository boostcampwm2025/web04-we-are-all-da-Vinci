import { ObjectiveType } from "./entity/mission.entity";

export const DAILY_RANDOM_COUNT = 2;
export const WEEKLY_RANDOM_COUNT = 1;

/** 튜토리얼 미션의 고정 createdAt — 사용자당 1행 보장 */
export const TUTORIAL_EPOCH = new Date("2026-01-01T00:00:00.000Z");

/** 도전 미션의 고정 createdAt — 사용자당 미션당 1행 보장 */
export const CHALLENGE_EPOCH = new Date("2026-01-02T00:00:00.000Z");

/** 도전 미션 티어 업 시 requiredCount 상한 — 도달 후에도 이 값으로 반복 완료 */
export const CHALLENGE_MAX_REQUIRED_COUNT = 1000;

/** POST /missions/action의 actionType → ObjectiveType 매핑 */
export const ACTION_TYPE_TO_OBJECTIVE: Record<string, ObjectiveType> = {
  visit_ranking: ObjectiveType.VISIT_RANKING,
  visit_mission_tab: ObjectiveType.VISIT_MISSION_TAB,
  visit_drawing_detail: ObjectiveType.VISIT_DRAWING_DETAIL,
  share: ObjectiveType.SHARE,
};
