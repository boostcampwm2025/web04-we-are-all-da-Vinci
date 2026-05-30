import type { UserQuest } from "../entity/user-quest.entity";
import type {
  ActionContext,
  DrawingContext,
  QuestCommand,
} from "../quest.types";

export class DailySubmitCommand implements QuestCommand {
  execute(userQuest: UserQuest, context: ActionContext): boolean {
    const { isFirstOfDay } = context as DrawingContext;
    if (!isFirstOfDay) return false;

    userQuest.currentCount += 1;
    return true;
  }
}
