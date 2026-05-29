import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { getSeoulDayRange, getSeoulWeekStart } from "src/common/util/time.util";
import { PointService } from "src/modules/point/point.service";
import {
  ObjectiveType,
  Quest,
  QuestPeriod,
  RewardType,
} from "./entitiy/quest.entity";
import { UserQuest } from "./entitiy/user-quest.entity";
import type { ActionContext, DrawingAction, QuestCommand } from "./quest.types";
import type { QuestRepository } from "./repository/quest.repository";
import type { UserQuestRepository } from "./repository/user-quest.repository";

const MAX_RECURSION_DEPTH = 2;
const DAILY_RANDOM_COUNT = 2;
const WEEKLY_RANDOM_COUNT = 2;

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);
  private readonly commandMap: Record<ObjectiveType, QuestCommand>;

  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: QuestRepository,
    @InjectRepository(UserQuest)
    private readonly userQuestRepository: UserQuestRepository,
    private readonly pointService: PointService,
  ) {
    this.commandMap = {
      [ObjectiveType.SUBMIT]: { execute: this.executeSubmit.bind(this) },
      [ObjectiveType.SCORE]: { execute: this.executeScore.bind(this) },
      [ObjectiveType.QUEST_COMPLETED]: {
        execute: this.executeQuestCompleted.bind(this),
      },
    };
  }

  async myQuests(userKey: number): Promise<UserQuest[]> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const existing = await this.userQuestRepository.findCurrentQuests(
      userKey,
      todayStart,
      weekStart,
    );

    if (existing.length > 0) return existing;

    const dailyQuests = await this.assignQuests(
      userKey,
      QuestPeriod.DAILY,
      todayStart,
      DAILY_RANDOM_COUNT,
    );
    const weeklyQuests = await this.assignQuests(
      userKey,
      QuestPeriod.WEEKLY,
      weekStart,
      WEEKLY_RANDOM_COUNT,
    );

    const all = [...dailyQuests, ...weeklyQuests];
    if (all.length > 0) {
      await this.userQuestRepository.flush();
    }

    this.logger.log(
      {
        event: "quest.assign.succeeded",
        userKey,
        dailyCount: dailyQuests.length,
        weeklyCount: weeklyQuests.length,
      },
      "퀘스트 배정 완료",
    );

    return all;
  }

  async recordAction(
    userKey: number,
    objectiveType: ObjectiveType,
    context: ActionContext,
    depth = 0,
  ): Promise<UserQuest[]> {
    if (depth > MAX_RECURSION_DEPTH) return [];

    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const activeQuests = await this.userQuestRepository.findActiveByObjective(
      userKey,
      objectiveType,
      todayStart,
      weekStart,
    );

    const completed: UserQuest[] = [];

    for (const uq of activeQuests) {
      const command = this.commandMap[objectiveType];
      const progressed = command.execute(uq, context);
      if (!progressed) continue;

      if (uq.currentCount >= uq.quest.requiredCount) {
        uq.completedAt = new Date();
        await this.grantReward(userKey, uq.quest);
        completed.push(uq);

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

    if (activeQuests.length > 0) {
      await this.userQuestRepository.flush();
    }

    if (completed.length > 0) {
      const metaCompleted = await this.recordAction(
        userKey,
        ObjectiveType.QUEST_COMPLETED,
        {},
        depth + 1,
      );
      completed.push(...metaCompleted);
    }

    return completed;
  }

  private async assignQuests(
    userKey: number,
    period: QuestPeriod,
    periodStart: Date,
    randomCount: number,
  ): Promise<UserQuest[]> {
    const fixedQuests = await this.questRepository.findFixed(period);
    const randomQuests = await this.questRepository.findRandom(period);

    const selected = [
      ...fixedQuests,
      ...this.pickRandom(randomQuests, randomCount),
    ];

    return selected.map((quest) =>
      this.userQuestRepository.createForUser(userKey, quest, periodStart),
    );
  }

  private pickRandom<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private executeSubmit(userQuest: UserQuest): boolean {
    userQuest.currentCount += 1;
    return true;
  }

  private executeScore(userQuest: UserQuest, context: DrawingAction): boolean {
    if (context.score == null) return false;
    if (
      userQuest.quest.threshold != null &&
      context.score < userQuest.quest.threshold
    ) {
      return false;
    }
    userQuest.currentCount += 1;
    return true;
  }

  private executeQuestCompleted(userQuest: UserQuest): boolean {
    userQuest.currentCount += 1;
    return true;
  }

  private async grantReward(userKey: number, quest: Quest): Promise<void> {
    switch (quest.rewardType) {
      case RewardType.POINT:
        await this.pointService.grantDrawingPromotionIfEligible(userKey);
        break;
      case RewardType.CHANCE:
        break;
    }
  }
}
