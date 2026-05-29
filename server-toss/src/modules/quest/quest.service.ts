import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { getSeoulDayRange, getSeoulWeekStart } from "src/common/util/time.util";
import { PointService } from "src/modules/point/point.service";
import {
  ObjectiveType,
  Quest,
  QuestPeriod,
  RewardType,
} from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";
import type {
  ActionContext,
  DrawingAction,
  QuestCommand,
  QuestCompletedAction,
} from "./quest.types";
import type { QuestRepository } from "./repository/quest.repository";
import type { UserQuestRepository } from "./repository/user-quest.repository";
import { MyQuestsResponseDto } from "./dto/my-quests-response.dto";

const DAILY_RANDOM_COUNT = 2;
const WEEKLY_RANDOM_COUNT = 2;

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);
  private readonly commandMap: Record<
    Exclude<ObjectiveType, ObjectiveType.QUEST_COMPLETED>,
    QuestCommand
  >;

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
    };
  }

  async myQuests(userKey: number): Promise<MyQuestsResponseDto> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    let quests = await this.userQuestRepository.findCurrentQuests(
      userKey,
      todayStart,
      weekStart,
    );

    if (quests.length === 0) {
      quests = await this.assignNewQuests(userKey, todayStart, weekStart);
    }

    return this.toMyQuestsResponse(quests);
  }

  private toMyQuestsResponse(quests: UserQuest[]): MyQuestsResponseDto {
    const dailyQuests = quests
      .filter((uq) => uq.quest.period === QuestPeriod.DAILY)
      .map((uq) => ({
        userQuestId: uq.id,
        questId: uq.quest.id,
        title: uq.quest.title,
        currentCount: uq.currentCount,
        requiredCount: uq.quest.requiredCount,
        rewardType: uq.quest.rewardType,
        rewardAmount: uq.quest.rewardAmount,
      }));

    const weeklyQuests = quests
      .filter((uq) => uq.quest.period === QuestPeriod.WEEKLY)
      .map((uq) => ({
        userQuestId: uq.id,
        questId: uq.quest.id,
        title: uq.quest.title,
        currentCount: uq.currentCount,
        requiredCount: uq.quest.requiredCount,
        rewardType: uq.quest.rewardType,
        rewardAmount: uq.quest.rewardAmount,
      }));

    return { dailyQuests, weeklyQuests };
  }

  @Transactional()
  async assignNewQuests(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
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

  @Transactional()
  async recordAction(
    userKey: number,
    objectiveType: Exclude<ObjectiveType, ObjectiveType.QUEST_COMPLETED>,
    context: ActionContext,
  ): Promise<UserQuest[]> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const completed = await this.progressQuests(
      userKey,
      objectiveType,
      context,
      todayStart,
      weekStart,
    );
    const metaCompleted = await this.processMetaQuests(
      userKey,
      completed,
      todayStart,
      weekStart,
    );

    await this.userQuestRepository.flush();

    return [...completed, ...metaCompleted];
  }

  private async progressQuests(
    userKey: number,
    objectiveType: Exclude<ObjectiveType, ObjectiveType.QUEST_COMPLETED>,
    context: ActionContext,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    const activeQuests = await this.userQuestRepository.findActiveByObjective(
      userKey,
      objectiveType,
      todayStart,
      weekStart,
    );

    const completed: UserQuest[] = [];
    const command = this.commandMap[objectiveType];

    for (const uq of activeQuests) {
      if (!command.execute(uq, context)) continue;
      if (this.completeIfFulfilled(uq)) completed.push(uq);
    }

    await this.grantRewards(userKey, completed);

    return completed;
  }

  private async processMetaQuests(
    userKey: number,
    completed: UserQuest[],
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    if (completed.length === 0) return [];

    const metaQuests = await this.userQuestRepository.findActiveByObjective(
      userKey,
      ObjectiveType.QUEST_COMPLETED,
      todayStart,
      weekStart,
    );

    const completedIds = completed.map((uq) => uq.id);
    const metaCompleted: UserQuest[] = [];

    for (const uq of metaQuests) {
      this.applyQuestCompleted(uq, { completedQuestIds: completedIds });
      if (this.completeIfFulfilled(uq)) metaCompleted.push(uq);
    }

    await this.grantRewards(userKey, metaCompleted);

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

  private applyQuestCompleted(
    userQuest: UserQuest,
    context: QuestCompletedAction,
  ): void {
    userQuest.currentCount += context.completedQuestIds.length;
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
