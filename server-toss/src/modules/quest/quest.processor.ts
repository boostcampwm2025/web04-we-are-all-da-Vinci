import { Injectable, Logger } from "@nestjs/common";
import { PointService } from "src/modules/point/point.service";
import { DailyScoreCommand } from "./command/daily-score.command";
import { DailySubmitCommand } from "./command/daily-submit.command";
import { PenaltyCommand } from "./command/penalty.command";
import { ScoreCommand } from "./command/score.command";
import { SubmitCommand } from "./command/submit.command";
import { ObjectiveType, Quest, RewardType } from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";
import type { ActionContext, CycleResult, QuestCommand } from "./quest.types";
import { PointReason } from "../point/entity/point-log.entity";

@Injectable()
export class QuestProcessor {
  private readonly logger = new Logger(QuestProcessor.name);
  private readonly commandMap: Record<
    Exclude<ObjectiveType, ObjectiveType.QUEST_COMPLETED>,
    QuestCommand
  >;

  constructor(private readonly pointService: PointService) {
    this.commandMap = {
      [ObjectiveType.SUBMIT]: new SubmitCommand(),
      [ObjectiveType.SCORE]: new ScoreCommand(),
      [ObjectiveType.PENALTY]: new PenaltyCommand(),
      [ObjectiveType.DAILY_SUBMIT]: new DailySubmitCommand(),
      [ObjectiveType.DAILY_SCORE]: new DailyScoreCommand(),
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
      const command =
        this.commandMap[
          uq.quest.objectiveType as Exclude<
            ObjectiveType,
            ObjectiveType.QUEST_COMPLETED
          >
        ];
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
      mq.currentCount += completed.length;
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
