import { Injectable, Logger } from "@nestjs/common";
import { PointService } from "src/modules/point/point.service";
import { DailyScoreCommand } from "./command/daily-score.command";
import { DailySubmitCommand } from "./command/daily-submit.command";
import { PenaltyCommand } from "./command/penalty.command";
import { ScoreCommand } from "./command/score.command";
import { SimpleActionCommand } from "./command/simple-action.command";
import {
  ObjectiveType,
  Quest,
  QuestPeriod,
  RewardType,
} from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";
import type { ActionContext, CycleResult, QuestCommand } from "./quest.types";
import { PointReason } from "../point/entity/point-log.entity";

@Injectable()
export class QuestProcessor {
  private readonly logger = new Logger(QuestProcessor.name);
  private readonly commandMap: Partial<Record<ObjectiveType, QuestCommand>>;

  constructor(private readonly pointService: PointService) {
    const simpleAction = new SimpleActionCommand();

    this.commandMap = {
      [ObjectiveType.SUBMIT]: simpleAction,
      [ObjectiveType.SCORE]: new ScoreCommand(),
      [ObjectiveType.PENALTY]: new PenaltyCommand(),
      [ObjectiveType.DAILY_SUBMIT]: new DailySubmitCommand(),
      [ObjectiveType.DAILY_SCORE]: new DailyScoreCommand(),
      [ObjectiveType.VISIT_RANKING]: simpleAction,
      [ObjectiveType.VISIT_PODIUM]: simpleAction,
      [ObjectiveType.VISIT_QUEST_TAB]: simpleAction,
      [ObjectiveType.VISIT_DRAWING_DETAIL]: simpleAction,
      [ObjectiveType.SHARE]: simpleAction,
      [ObjectiveType.RETRY]: simpleAction,
    };
  }

  async executeProgressCycle(
    userKey: number,
    activeQuests: UserQuest[],
    metaQuests: UserQuest[],
    context: ActionContext,
  ): Promise<CycleResult> {
    const completed = this.progressQuests(activeQuests, context);

    const metaCompleted =
      completed.length > 0 ? this.processMetaQuests(metaQuests, completed) : [];

    await this.grantRewards(userKey, [...completed, ...metaCompleted]);

    return { completed, metaCompleted };
  }

  private progressQuests(
    activeQuests: UserQuest[],
    context: ActionContext,
  ): UserQuest[] {
    const completed: UserQuest[] = [];

    for (const uq of activeQuests) {
      const command = this.commandMap[uq.quest.objectiveType];
      if (!command?.execute(uq, context)) continue;
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
        );
        break;
      case RewardType.CHANCE:
        break;
    }
  }
}
