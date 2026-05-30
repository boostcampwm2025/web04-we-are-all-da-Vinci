import type { UserQuest } from "../entity/user-quest.entity";
import type { QuestCommand } from "../quest.types";

export class SubmitCommand implements QuestCommand {
  execute(userQuest: UserQuest): boolean {
    userQuest.currentCount += 1;
    return true;
  }
}
