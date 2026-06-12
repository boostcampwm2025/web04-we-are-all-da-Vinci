import type { MissionCommand } from "../mission.types";

/**
 * 조건 없이 항상 충족으로 판단하는 단순 액션 Command.
 * 그림 제출(SUBMIT/DAILY_SUBMIT), 페이지 방문(VISIT_*), 공유(SHARE) 등에 공용.
 * "하루 1회"류 제약은 커맨드가 아니라 Mission.progressPeriod로 표현된다.
 */
export class SimpleActionCommand implements MissionCommand {
  matches(): boolean {
    return true;
  }
}
