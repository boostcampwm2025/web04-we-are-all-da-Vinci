import { EntityManager } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { getSeoulDayRange, getSeoulWeekStart } from "src/common/util/time.util";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { MyQuestsResponseDto } from "./dto/my-quests-response.dto";
import { ObjectiveType, Quest, QuestPeriod } from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";
import type {
  ActionContext,
  DrawingContext,
  DrawingSubmittedEvent,
} from "./quest.types";
import { QuestProcessor } from "./quest.processor";
import type { QuestRepository } from "./repository/quest.repository";
import type { UserQuestRepository } from "./repository/user-quest.repository";

const DAILY_RANDOM_COUNT = 2;
const WEEKLY_RANDOM_COUNT = 1;

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: QuestRepository,
    @InjectRepository(UserQuest)
    private readonly userQuestRepository: UserQuestRepository,
    private readonly processor: QuestProcessor,
    private readonly em: EntityManager,
  ) {}

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
    const metaQuests = await this.userQuestRepository.findActiveByObjective(
      userKey,
      ObjectiveType.QUEST_COMPLETED,
      todayStart,
      weekStart,
    );

    const result = await this.processor.executeProgressCycle(
      userKey,
      activeQuests,
      metaQuests,
      context,
    );

    await this.userQuestRepository.flush();

    return [...result.completed, ...result.metaCompleted];
  }

  @Transactional()
  async recordAction(
    userKey: number,
    objectiveType: Exclude<ObjectiveType, ObjectiveType.QUEST_COMPLETED>,
    context: ActionContext,
  ): Promise<UserQuest[]> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const activeQuests = await this.userQuestRepository.findActiveByObjective(
      userKey,
      objectiveType,
      todayStart,
      weekStart,
    );
    const metaQuests = await this.userQuestRepository.findActiveByObjective(
      userKey,
      ObjectiveType.QUEST_COMPLETED,
      todayStart,
      weekStart,
    );

    const result = await this.processor.executeProgressCycle(
      userKey,
      activeQuests,
      metaQuests,
      context,
    );

    await this.userQuestRepository.flush();

    return [...result.completed, ...result.metaCompleted];
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
}
