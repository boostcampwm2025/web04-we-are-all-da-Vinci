import type { UserQuest } from "./entity/user-quest.entity";

export type DrawingAction = {
  drawingId?: bigint;
  score?: number;
};

export type QuestCompletedAction = {
  completedQuestIds: bigint[];
};

export type ActionContext = DrawingAction | QuestCompletedAction;

export interface QuestCommand {
  execute(userQuest: UserQuest, context?: ActionContext): boolean;
}
