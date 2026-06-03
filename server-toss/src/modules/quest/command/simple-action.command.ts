import type { UserQuest } from "../entity/user-quest.entity";
import type { QuestCommand } from "../quest.types";

/**
 * 조건 없이 카운트를 1 증가시키는 단순 액션 Command.
 * 페이지 방문(VISIT_*), 공유(SHARE), 재시도(RETRY) 등에 공용.
 */
export class SimpleActionCommand implements QuestCommand {
  execute(userQuest: UserQuest): boolean {
    userQuest.currentCount += 1;
    return true;
  }
}
