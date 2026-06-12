import { Injectable, Logger } from "@nestjs/common";
import { PointService } from "src/modules/point/point.service";
import { PenaltyCommand } from "../command/penalty.command";
import { ScoreCommand } from "../command/score.command";
import { SimpleActionCommand } from "../command/simple-action.command";
import {
  ObjectiveType,
  Mission,
  MissionPeriod,
  RewardType,
} from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { ProgressLimit } from "../progress-limit";
import { MissionWindow } from "../mission-window";
import type {
  ActionContext,
  CycleResult,
  MissionCommand,
} from "../mission.types";
import { PointReason } from "../../point/entity/point-log.entity";

@Injectable()
export class MissionProcessor {
  private readonly logger = new Logger(MissionProcessor.name);
  private readonly commandMap: Partial<Record<ObjectiveType, MissionCommand>>;

  constructor(private readonly pointService: PointService) {
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
    };
  }

  async executeProgressCycle(
    userKey: number,
    activeMissions: UserMission[],
    metaMissions: UserMission[],
    context: ActionContext,
    window: MissionWindow,
  ): Promise<CycleResult> {
    const completed = this.progressMissions(activeMissions, context, window);

    const metaCompleted =
      completed.length > 0
        ? this.processMetaMissions(metaMissions, completed)
        : [];

    await this.grantRewards(userKey, [...completed, ...metaCompleted]);

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
      if (this.completeIfFulfilled(uq)) completed.push(uq);
    }

    return completed;
  }

  private processMetaMissions(
    metaMissions: UserMission[],
    completed: UserMission[],
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
      if (this.completeIfFulfilled(mq)) metaCompleted.push(mq);
    }

    return metaCompleted;
  }

  private completeIfFulfilled(uq: UserMission): boolean {
    if (uq.currentCount < uq.mission.requiredCount) return false;
    uq.completedAt = new Date();
    return true;
  }

  private async grantRewards(
    userKey: number,
    completed: UserMission[],
  ): Promise<void> {
    for (const uq of completed) {
      if (uq.mission.rewardAmount === 0) continue;
      await this.grantReward(userKey, uq.mission);

      this.logger.log(
        {
          event: "mission.complete.succeeded",
          userKey,
          missionId: uq.mission.id.toString(),
          rewardType: uq.mission.rewardType,
          rewardAmount: uq.mission.rewardAmount,
        },
        "미션 완료",
      );
    }
  }

  private async grantReward(userKey: number, mission: Mission): Promise<void> {
    switch (mission.rewardType) {
      case RewardType.POINT:
        await this.pointService.savePointGrantRequest(
          userKey,
          PointReason.MISSION,
          mission.rewardAmount,
        );
        break;
      case RewardType.CHANCE:
        break;
    }
  }
}
