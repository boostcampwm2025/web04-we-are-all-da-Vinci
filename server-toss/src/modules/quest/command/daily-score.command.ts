import type { UserQuest } from "../entity/user-quest.entity";
import type {
  ActionContext,
  DrawingContext,
  QuestCommand,
} from "../quest.types";

export class DailyScoreCommand implements QuestCommand {
  execute(userQuest: UserQuest, context: ActionContext): boolean {
    const { score, todayMaxScore } = context as DrawingContext;
    if (score == null) return false;

    const { threshold } = userQuest.quest;
    if (threshold != null && score < threshold) return false;
    if (
      todayMaxScore != null &&
      threshold != null &&
      todayMaxScore >= threshold
    )
      return false;

    userQuest.currentCount += 1;
    return true;
  }
}
