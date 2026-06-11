import type { UserQuest } from "../entity/user-quest.entity";
import type {
  ActionContext,
  DrawingContext,
  QuestCommand,
} from "../quest.types";

export class PenaltyCommand implements QuestCommand {
  matches(userQuest: UserQuest, context: ActionContext): boolean {
    const { penalty } = context as DrawingContext;
    if (penalty == null) return false;

    const { threshold } = userQuest.quest;
    if (threshold != null && penalty > threshold) return false;

    return true;
  }
}
