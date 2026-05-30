import { EntityManager } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { getSeoulDayRange, getSeoulWeekStart } from "src/common/util/time.util";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { PointService } from "src/modules/point/point.service";
import { DailyScoreCommand } from "./command/daily-score.command";
import { DailySubmitCommand } from "./command/daily-submit.command";
import { PenaltyCommand } from "./command/penalty.command";
import { ScoreCommand } from "./command/score.command";
import { SubmitCommand } from "./command/submit.command";
import { MyQuestsResponseDto } from "./dto/my-quests-response.dto";
import {
  ObjectiveType,
  Quest,
  QuestPeriod,
  RewardType,
} from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";
import type {
  ActionContext,
  DrawingContext,
  DrawingSubmittedEvent,
  QuestCommand,
  QuestCompletedAction,
} from "./quest.types";
import type { QuestRepository } from "./repository/quest.repository";
import type { UserQuestRepository } from "./repository/user-quest.repository";

const DAILY_RANDOM_COUNT = 2;
const WEEKLY_RANDOM_COUNT = 1;

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
    private readonly em: EntityManager,
  ) {
    this.commandMap = {
      [ObjectiveType.SUBMIT]: new SubmitCommand(),
      [ObjectiveType.SCORE]: new ScoreCommand(),
      [ObjectiveType.PENALTY]: new PenaltyCommand(),
      [ObjectiveType.DAILY_SUBMIT]: new DailySubmitCommand(),
      [ObjectiveType.DAILY_SCORE]: new DailyScoreCommand(),
    };
  }

  async myQuests(userKey: number): Promise<MyQuestsResponseDto> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const quests = await this.userQuestRepository.findCurrentQuests(
      userKey,
      todayStart,
      weekStart,
    );

    return this.toMyQuestsResponse(quests);
  }

  async assignOrGetQuests(userKey: number): Promise<MyQuestsResponseDto> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    await this.ensureQuestsAssigned(userKey, todayStart, weekStart);

    const quests = await this.userQuestRepository.findCurrentQuests(
      userKey,
      todayStart,
      weekStart,
    );
    return this.toMyQuestsResponse(quests);
  }

  private async ensureQuestsAssigned(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<void> {
    const existing = await this.userQuestRepository.findCurrentQuests(
      userKey,
      todayStart,
      weekStart,
    );
    if (existing.length > 0) return;

    try {
      await this.assignNewQuests(userKey, todayStart, weekStart);
    } catch (err) {
      if (!this.isDuplicateKeyError(err)) throw err;
      // 동시 요청으로 이미 배정됨 — 무시
    }
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "ER_DUP_ENTRY"
    );
  }

  @Transactional()
  async onDrawingSubmitted(
    userKey: number,
    event: DrawingSubmittedEvent,
  ): Promise<UserQuest[]> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const context = await this.buildDrawingContext(userKey, event, todayStart);

    await this.ensureQuestsAssigned(userKey, todayStart, weekStart);

    const activeQuests = await this.userQuestRepository.findActiveDrawingQuests(
      userKey,
      todayStart,
      weekStart,
    );

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

    await this.grantRewards(userKey, completed);
    const metaCompleted = await this.processMetaQuests(
      userKey,
      completed,
      todayStart,
      weekStart,
    );
    await this.userQuestRepository.flush();

    return [...completed, ...metaCompleted];
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

  private async buildDrawingContext(
    userKey: number,
    event: DrawingSubmittedEvent,
    todayStart: Date,
  ): Promise<DrawingContext> {
    const { end: todayEnd } = getSeoulDayRange();
    const todayDrawings: Pick<Drawing, "score">[] = await this.em.find(
      Drawing,
      {
        user: userKey,
        createdAt: { $gte: todayStart, $lt: todayEnd },
        id: { $ne: event.drawingId },
      },
      { fields: ["score"] },
    );

    return {
      ...event,
      isFirstOfDay: todayDrawings.length === 0,
      todayMaxScore:
        todayDrawings.length > 0
          ? Math.max(...todayDrawings.map((d) => d.score))
          : undefined,
    };
  }

  private toMyQuestsResponse(quests: UserQuest[]): MyQuestsResponseDto {
    const dailyQuests = quests
      .filter((uq) => uq.quest.period === QuestPeriod.DAILY)
      .map((uq) => ({
        userQuestId: Number(uq.id),
        questId: Number(uq.quest.id),
        title: uq.quest.title,
        currentCount: uq.currentCount,
        requiredCount: uq.quest.requiredCount,
        rewardType: uq.quest.rewardType,
        rewardAmount: uq.quest.rewardAmount,
      }));

    const weeklyQuests = quests
      .filter((uq) => uq.quest.period === QuestPeriod.WEEKLY)
      .map((uq) => ({
        userQuestId: Number(uq.id),
        questId: Number(uq.quest.id),
        title: uq.quest.title,
        currentCount: uq.currentCount,
        requiredCount: uq.quest.requiredCount,
        rewardType: uq.quest.rewardType,
        rewardAmount: uq.quest.rewardAmount,
      }));

    return { dailyQuests, weeklyQuests };
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
