import { Injectable } from "@nestjs/common";
import { PenaltyCommand } from "../command/penalty.command";
import { ScoreCommand } from "../command/score.command";
import { SimpleActionCommand } from "../command/simple-action.command";
import { MissionPeriod, ObjectiveType } from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import type {
  ActionContext,
  CycleResult,
  MissionCommand,
} from "../mission.types";
import { ProgressLimit } from "../progress-limit";

@Injectable()
export class MissionProcessor {
  private readonly commandMap: Partial<Record<ObjectiveType, MissionCommand>>;

  constructor() {
    const simpleAction = new SimpleActionCommand();
    const score = new ScoreCommand();
    const penalty = new PenaltyCommand();

    // 진행 케이던스(하루 1회 등)는 commandMap이 아니라 Mission.progressPeriod로 표현된다.
    // → DAILY_SUBMIT은 SUBMIT과, DAILY_SCORE는 SCORE와 동일한 매처를 쓴다.
    this.commandMap = {
      [ObjectiveType.SUBMIT]: simpleAction,
      [ObjectiveType.SCORE]: score,
      [ObjectiveType.PENALTY]: penalty,
      [ObjectiveType.DAILY_SUBMIT]: simpleAction,
      [ObjectiveType.DAILY_SCORE]: score,
      [ObjectiveType.VISIT_RANKING]: simpleAction,
      [ObjectiveType.VISIT_MISSION_TAB]: simpleAction,
      [ObjectiveType.VISIT_DRAWING_DETAIL]: simpleAction,
      [ObjectiveType.SHARE]: simpleAction,
      // INVITE는 공유 적립(syncInviteProgress)에서만 진행한다. 프로세서가 어떤
      // 경로로도 INVITE를 증가시키지 못하도록 commandMap에서 제외(이중 안전망).
    };
  }

  executeProgressCycle(
    activeMissions: UserMission[],
    metaMissions: UserMission[],
    context: ActionContext,
    window: MissionWindow,
  ): CycleResult {
    const completed = this.progressMissions(activeMissions, context, window);

    const metaCompleted =
      completed.length > 0
        ? this.processMetaMissions(metaMissions, completed, window)
        : [];

    return { completed, metaCompleted };
  }

  private progressMissions(
    activeMissions: UserMission[],
    context: ActionContext,
    window: MissionWindow,
  ): UserMission[] {
    const completed: UserMission[] = [];

    for (const uq of activeMissions) {
      const command = this.commandMap[uq.mission.objectiveType];
      if (!command?.matches(uq, context)) continue;
      // 케이던스 게이트: 이미 이번 주기에 진행했으면 스킵 (순수 — IO 없음)
      if (!ProgressLimit.of(uq.mission).allows(uq.lastProgressedAt, window))
        continue;

      uq.currentCount += 1;
      uq.lastProgressedAt = window.now;
      if (this.completeIfFulfilled(uq, window.now)) completed.push(uq);
    }

    return completed;
  }

  private processMetaMissions(
    metaMissions: UserMission[],
    completed: UserMission[],
    window: MissionWindow,
  ): UserMission[] {
    const metaCompleted: UserMission[] = [];

    for (const mq of metaMissions) {
      const category = mq.mission.category;
      // category가 있으면 → 같은 카테고리의 완료 수만 카운트 (튜토리얼)
      // category가 없으면 → 일일 미션 완료 수 카운트 (일일/주간 메타)
      const relevantCount = category
        ? completed.filter((c) => c.mission.category === category).length
        : completed.filter((c) => c.mission.period === MissionPeriod.DAILY)
            .length;

      mq.currentCount += relevantCount;
      if (this.completeIfFulfilled(mq, window.now)) metaCompleted.push(mq);
    }

    return metaCompleted;
  }

  private completeIfFulfilled(uq: UserMission, now: Date): boolean {
    if (uq.currentCount < (uq.requiredCount ?? uq.mission.requiredCount))
      return false;
    uq.completedAt = now;
    return true;
  }
}
