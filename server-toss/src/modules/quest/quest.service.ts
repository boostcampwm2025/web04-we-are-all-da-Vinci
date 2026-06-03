import { EntityManager } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { getSeoulDayRange, getSeoulWeekStart } from "src/common/util/time.util";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { MyQuestsResponseDto } from "./dto/my-quests-response.dto";
import { ObjectiveType, Quest, QuestPeriod } from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";
import { QuestProcessor } from "./quest.processor";
import { QuestMapper } from "./quest.mapper";
import type {
  CycleResult,
  DrawingContext,
  DrawingSubmittedEvent,
} from "./quest.types";
import type { QuestRepository } from "./repository/quest.repository";
import type { UserQuestRepository } from "./repository/user-quest.repository";

const DAILY_RANDOM_COUNT = 2;
const WEEKLY_RANDOM_COUNT = 1;

/** 튜토리얼 퀘스트의 고정 createdAt — 사용자당 1행 보장 */
const TUTORIAL_EPOCH = new Date("2026-01-01T00:00:00.000Z");

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

  // ─── 조회 ───

  async myQuests(userKey: number): Promise<MyQuestsResponseDto> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const quests = await this.userQuestRepository.findCurrentQuests(
      userKey,
      todayStart,
      weekStart,
    );
    const tutorialQuests =
      await this.userQuestRepository.findTutorialQuests(userKey);

    return QuestMapper.toResponse(quests, tutorialQuests);
  }

  async assignOrGetQuests(userKey: number): Promise<MyQuestsResponseDto> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    await this.ensureQuestsAssigned(userKey, todayStart, weekStart);
    await this.ensureTutorialAssigned(userKey);

    const quests = await this.userQuestRepository.findCurrentQuests(
      userKey,
      todayStart,
      weekStart,
    );
    const tutorialQuests =
      await this.userQuestRepository.findTutorialQuests(userKey);

    return QuestMapper.toResponse(quests, tutorialQuests);
  }

  // ─── daily/weekly 할당 ───

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
    }
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

  // ─── 튜토리얼 할당 ───

  private async ensureTutorialAssigned(userKey: number): Promise<void> {
    const existing = await this.userQuestRepository.findTutorialQuests(userKey);
    if (existing.length > 0) return;

    try {
      await this.assignTutorialQuests(userKey);
    } catch (err) {
      if (!this.isDuplicateKeyError(err)) throw err;
    }
  }

  private async assignTutorialQuests(userKey: number): Promise<void> {
    const quests = await this.questRepository.findTutorial();

    for (const quest of quests) {
      this.userQuestRepository.createForUser(userKey, quest, TUTORIAL_EPOCH);
    }

    await this.userQuestRepository.flush();

    this.logger.log(
      {
        event: "quest.tutorial.assign.succeeded",
        userKey,
        count: quests.length,
      },
      "튜토리얼 퀘스트 배정 완료",
    );
  }

  // ─── 그림 제출 이벤트 (daily/weekly + tutorial) ───

  @Transactional()
  async onDrawingSubmitted(
    userKey: number,
    event: DrawingSubmittedEvent,
  ): Promise<UserQuest[]> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const context = await this.buildDrawingContext(userKey, event, todayStart);

    await this.ensureQuestsAssigned(userKey, todayStart, weekStart);
    await this.ensureTutorialAssigned(userKey);

    // daily/weekly + tutorial SUBMIT/SCORE/RETRY가 함께 포함됨
    const activeQuests = await this.userQuestRepository.findActiveDrawingQuests(
      userKey,
      todayStart,
      weekStart,
    );
    const weeklyMeta = await this.userQuestRepository.findActiveByObjective(
      userKey,
      ObjectiveType.QUEST_COMPLETED,
      todayStart,
      weekStart,
    );
    const tutorialMeta =
      await this.userQuestRepository.findActiveTutorialMeta(userKey);

    const result = await this.processor.executeProgressCycle(
      userKey,
      activeQuests,
      [...weeklyMeta, ...tutorialMeta],
      context,
    );

    await this.userQuestRepository.flush();

    return [...result.completed, ...result.metaCompleted];
  }

  // ─── 퀘스트 액션 (방문/공유/재시도 등 — 전 period 대상) ───

  @Transactional()
  async onQuestAction(
    userKey: number,
    objectiveType: ObjectiveType,
  ): Promise<CycleResult> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    await this.ensureQuestsAssigned(userKey, todayStart, weekStart);
    await this.ensureTutorialAssigned(userKey);

    const dailyWeeklyActive =
      await this.userQuestRepository.findActiveByObjective(
        userKey,
        objectiveType,
        todayStart,
        weekStart,
      );
    const tutorialActive =
      await this.userQuestRepository.findActiveTutorialByObjective(
        userKey,
        objectiveType,
      );

    const weeklyMeta = await this.userQuestRepository.findActiveByObjective(
      userKey,
      ObjectiveType.QUEST_COMPLETED,
      todayStart,
      weekStart,
    );
    const tutorialMeta =
      await this.userQuestRepository.findActiveTutorialMeta(userKey);

    const result = await this.processor.executeProgressCycle(
      userKey,
      [...dailyWeeklyActive, ...tutorialActive],
      [...weeklyMeta, ...tutorialMeta],
      {},
    );

    await this.userQuestRepository.flush();

    return result;
  }

  // ─── 유틸 ───

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

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "ER_DUP_ENTRY"
    );
  }

  private pickRandom<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
