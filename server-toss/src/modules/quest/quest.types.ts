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

export type ActionContext = DrawingContext | QuestCompletedAction;

export interface QuestCommand {
  execute(userQuest: UserQuest, context: ActionContext): boolean;
}
