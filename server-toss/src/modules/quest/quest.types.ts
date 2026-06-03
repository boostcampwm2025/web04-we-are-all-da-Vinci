import type { UserQuest } from "./entity/user-quest.entity";

export type DrawingSubmittedEvent = {
  drawingId: bigint;
  score: number;
  penalty: number;
};

export type DrawingContext = DrawingSubmittedEvent & {
  isFirstOfDay: boolean;
  todayMaxScore?: number;
};

export type QuestCompletedAction = {
  completedQuestIds: bigint[];
};

export type TutorialActionContext = Record<string, never>;

export type ActionContext =
  | DrawingContext
  | QuestCompletedAction
  | TutorialActionContext;

export interface QuestCommand {
  execute(userQuest: UserQuest, context: ActionContext): boolean;
}

export interface CycleResult {
  completed: UserQuest[];
  metaCompleted: UserQuest[];
}
