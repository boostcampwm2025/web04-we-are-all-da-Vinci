import { ObjectiveType } from "./entity/quest.entity";
import type { UserQuest } from "./entity/user-quest.entity";

export type BaseActionContext = { objectiveType: ObjectiveType };

export type DrawingContext = {
  drawingId: bigint;
  score: number;
  penalty: number;
};

export type QuestCompletedAction = {
  completedQuestIds: bigint[];
};

export type ActionContext =
  | DrawingContext
  | (QuestCompletedAction & BaseActionContext)
  | BaseActionContext;

/**
 * 이벤트가 퀘스트 목표를 충족하는지 판단하는 순수 predicate.
 * 카운트 증가/케이던스 게이트는 processor가 담당한다 (커맨드는 mutation 없음).
 */
export interface QuestCommand {
  matches(userQuest: UserQuest, context: ActionContext): boolean;
}

export interface CycleResult {
  completed: UserQuest[];
  metaCompleted: UserQuest[];
}
