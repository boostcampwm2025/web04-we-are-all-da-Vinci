import { EntityManager } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
import { getSeoulDayRange, getSeoulWeekStart } from "src/common/util/time.util";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { MyQuestsResponseDto } from "../dto/my-quests-response.dto";
import { ObjectiveType } from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";
import { QuestMapper } from "../quest.mapper";
import type {
  CycleResult,
  DrawingContext,
  DrawingSubmittedEvent,
} from "../quest.types";
import type { UserQuestRepository } from "../repository/user-quest.repository";
import { AssignQuestService } from "./assign-quest.service";
import { QuestProcessor } from "./quest.processor";

@Injectable()
export class QuestService {
  constructor(
    @InjectRepository(UserQuest)
    private readonly userQuestRepository: UserQuestRepository,
    private readonly processor: QuestProcessor,
    private readonly assignQuestService: AssignQuestService,
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
    const tutorialQuests =
      await this.userQuestRepository.findTutorialQuests(userKey);

    return QuestMapper.toResponse(quests, tutorialQuests);
  }

  async assignQuests(userKey: number): Promise<void> {
    await this.assignQuestService.ensureAllQuestsAssigned(userKey);
  }

  @Transactional()
  async onDrawingSubmitted(
    userKey: number,
    event: DrawingSubmittedEvent,
  ): Promise<UserQuest[]> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    const context = await this.buildDrawingContext(userKey, event, todayStart);

    await this.assignQuestService.ensureAllQuestsAssigned(userKey);

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

  @Transactional()
  async onQuestAction(
    userKey: number,
    objectiveType: ObjectiveType,
  ): Promise<CycleResult> {
    const { start: todayStart } = getSeoulDayRange();
    const weekStart = getSeoulWeekStart();

    await this.assignQuestService.ensureAllQuestsAssigned(userKey);

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
}
