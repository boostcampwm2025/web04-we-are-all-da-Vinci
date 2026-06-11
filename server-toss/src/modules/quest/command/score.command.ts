import type { UserQuest } from "../entity/user-quest.entity";
import type {
  ActionContext,
  DrawingContext,
  QuestCommand,
} from "../quest.types";

export class ScoreCommand implements QuestCommand {
  matches(userQuest: UserQuest, context: ActionContext): boolean {
    const { score } = context as DrawingContext;
    if (score == null) return false;

    const { threshold } = userQuest.quest;
    if (threshold != null && score < threshold) return false;

    return true;
  }
}
