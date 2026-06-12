import { Injectable, Logger } from "@nestjs/common";
import { PointService } from "src/modules/point/point.service";
import { PenaltyCommand } from "../command/penalty.command";
import { ScoreCommand } from "../command/score.command";
import { SimpleActionCommand } from "../command/simple-action.command";
import {
  ObjectiveType,
  Quest,
  QuestPeriod,
  RewardType,
} from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";
import { ProgressLimit } from "../progress-limit";
import { QuestWindow } from "../quest-window";
import type { ActionContext, CycleResult, QuestCommand } from "../quest.types";
import { PointReason } from "../../point/entity/point-log.entity";

@Injectable()
export class QuestProcessor {
  private readonly logger = new Logger(QuestProcessor.name);
  private readonly commandMap: Partial<Record<ObjectiveType, QuestCommand>>;

  constructor(private readonly pointService: PointService) {
    const simpleAction = new SimpleActionCommand();
    const score = new ScoreCommand();
    const penalty = new PenaltyCommand();

    // 진행 케이던스(하루 1회 등)는 commandMap이 아니라 Quest.progressPeriod로 표현된다.
    // → DAILY_SUBMIT은 SUBMIT과, DAILY_SCORE는 SCORE와 동일한 매처를 쓴다.
    this.commandMap = {
      [ObjectiveType.SUBMIT]: simpleAction,
      [ObjectiveType.SCORE]: score,
      [ObjectiveType.PENALTY]: penalty,
      [ObjectiveType.DAILY_SUBMIT]: simpleAction,
      [ObjectiveType.DAILY_SCORE]: score,
      [ObjectiveType.VISIT_RANKING]: simpleAction,
      [ObjectiveType.VISIT_QUEST_TAB]: simpleAction,
      [ObjectiveType.VISIT_DRAWING_DETAIL]: simpleAction,
      [ObjectiveType.SHARE]: simpleAction,
    };
  }

  async executeProgressCycle(
    userKey: number,
    activeQuests: UserQuest[],
    metaQuests: UserQuest[],
    context: ActionContext,
    window: QuestWindow,
  ): Promise<CycleResult> {
    const completed = this.progressQuests(activeQuests, context, window);

    const metaCompleted =
      completed.length > 0 ? this.processMetaQuests(metaQuests, completed) : [];

    await this.grantRewards(userKey, [...completed, ...metaCompleted]);

    return { completed, metaCompleted };
  }

  private progressQuests(
    activeQuests: UserQuest[],
    context: ActionContext,
    window: QuestWindow,
  ): UserQuest[] {
    const completed: UserQuest[] = [];

    for (const uq of activeQuests) {
      const command = this.commandMap[uq.quest.objectiveType];
      if (!command?.matches(uq, context)) continue;
      // 케이던스 게이트: 이미 이번 주기에 진행했으면 스킵 (순수 — IO 없음)
      if (!ProgressLimit.of(uq.quest).allows(uq.lastProgressedAt, window))
        continue;

      uq.currentCount += 1;
      uq.lastProgressedAt = window.now;
      if (this.completeIfFulfilled(uq)) completed.push(uq);
    }

    return completed;
  }

  private processMetaQuests(
    metaQuests: UserQuest[],
    completed: UserQuest[],
  ): UserQuest[] {
    const metaCompleted: UserQuest[] = [];

    for (const mq of metaQuests) {
      const category = mq.quest.category;
      // category가 있으면 → 같은 카테고리의 완료 수만 카운트 (튜토리얼)
      // category가 없으면 → 일일 퀘스트 완료 수 카운트 (일일/주간 메타)
      const relevantCount = category
        ? completed.filter((c) => c.quest.category === category).length
        : completed.filter((c) => c.quest.period === QuestPeriod.DAILY).length;

      mq.currentCount += relevantCount;
      if (this.completeIfFulfilled(mq)) metaCompleted.push(mq);
    }

    return metaCompleted;
  }

  private completeIfFulfilled(uq: UserQuest): boolean {
    if (uq.currentCount < uq.quest.requiredCount) return false;
    uq.completedAt = new Date();
    return true;
  }

  private async grantRewards(
    userKey: number,
    completed: UserQuest[],
  ): Promise<void> {
    for (const uq of completed) {
      if (uq.quest.rewardAmount === 0) continue;
      await this.grantReward(userKey, uq.quest);

      this.logger.log(
        {
          event: "quest.complete.succeeded",
          userKey,
          questId: uq.quest.id.toString(),
          rewardType: uq.quest.rewardType,
          rewardAmount: uq.quest.rewardAmount,
        },
        "퀘스트 완료",
      );
    }
  }

  private async grantReward(userKey: number, quest: Quest): Promise<void> {
    switch (quest.rewardType) {
      case RewardType.POINT:
        await this.pointService.savePointGrantRequest(
          userKey,
          PointReason.QUEST,
          quest.rewardAmount,
        );
        break;
      case RewardType.CHANCE:
        break;
    }
  }
}
