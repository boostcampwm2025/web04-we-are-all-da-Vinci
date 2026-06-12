import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
import { MyQuestsResponseDto } from "../dto/my-quests-response.dto";
import { ObjectiveType } from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";
import { QuestWindow } from "../quest-window";
import { QuestMapper } from "../quest.mapper";
import type {
  BaseActionContext,
  CycleResult,
  DrawingContext,
} from "../quest.types";
import type { UserQuestRepository } from "../repository/user-quest.repository";
import { AssignQuestService } from "./assign-quest.service";
import { QuestProcessor } from "./quest.processor";
import { TutorialQuestService } from "./tutorial-quest.service";

@Injectable()
export class QuestService {
  constructor(
    @InjectRepository(UserQuest)
    private readonly userQuestRepo: UserQuestRepository,
    private readonly processor: QuestProcessor,
    private readonly assignQuestService: AssignQuestService,
    private readonly tutorialQuestService: TutorialQuestService,
  ) {}

  async myQuests(userKey: number): Promise<MyQuestsResponseDto> {
    return this.queryMyQuests(userKey, QuestWindow.now());
  }

  async assignAndGetMyQuests(userKey: number): Promise<MyQuestsResponseDto> {
    const window = QuestWindow.now();
    await this.assignQuestService.ensureQuestsAssigned(userKey, window);
    return this.queryMyQuests(userKey, window);
  }

  private async queryMyQuests(
    userKey: number,
    window: QuestWindow,
  ): Promise<MyQuestsResponseDto> {
    const quests = await this.userQuestRepo.findCurrentQuests(
      userKey,
      window.todayStart,
      window.weekStart,
    );
    const tutorialQuests = await this.userQuestRepo.findTutorialQuests(userKey);

    return QuestMapper.toResponse(quests, tutorialQuests);
  }

  // ─── 그림 제출 이벤트 (daily/weekly + tutorial SUBMIT/SCORE/RETRY) ───

  @Transactional()
  async onDrawingSubmitted(
    userKey: number,
    context: DrawingContext,
  ): Promise<CycleResult> {
    const window = QuestWindow.now();
    await this.assignQuestService.ensureQuestsAssigned(userKey, window);
    // 같은 유저 동시 요청 직렬화 — 활성 퀘스트 조회 전에 행을 잠근다
    await this.userQuestRepo.lockActiveForUpdate(userKey);

    const drawingActive = await this.userQuestRepo.findActiveDrawingQuests(
      userKey,
      window.todayStart,
      window.weekStart,
    );
    // 튜토리얼은 완료 게이트 뒤 — 완료 유저는 쿼리 없이 []
    const tutorialDrawing =
      await this.tutorialQuestService.findActiveDrawing(userKey);

    const weeklyMeta = await this.userQuestRepo.findActiveByObjective(
      userKey,
      ObjectiveType.QUEST_COMPLETED,
      window.todayStart,
      window.weekStart,
    );
    const tutorialMeta =
      await this.tutorialQuestService.findActiveMeta(userKey);

    const result = await this.processor.executeProgressCycle(
      userKey,
      [...drawingActive, ...tutorialDrawing],
      [...weeklyMeta, ...tutorialMeta],
      context,
      window,
    );

    await this.tutorialQuestService.recordCompletionIfFinished(
      userKey,
      result,
      window,
    );
    await this.userQuestRepo.flush();

    return result;
  }

  // ─── 퀘스트 액션 (방문/공유 등 — 전 period 대상) ───

  @Transactional()
  async onActionReported(
    userKey: number,
    context: BaseActionContext,
  ): Promise<CycleResult> {
    const window = QuestWindow.now();
    await this.assignQuestService.ensureQuestsAssigned(userKey, window);
    // 같은 유저 동시 요청 직렬화 — 활성 퀘스트 조회 전에 행을 잠근다
    await this.userQuestRepo.lockActiveForUpdate(userKey);

    const dailyWeeklyActive = await this.userQuestRepo.findActiveByObjective(
      userKey,
      context.objectiveType,
      window.todayStart,
      window.weekStart,
    );
    // 튜토리얼은 완료 게이트 뒤 — 완료 유저는 쿼리 없이 []
    const tutorialActive =
      await this.tutorialQuestService.findActiveByObjective(
        userKey,
        context.objectiveType,
      );

    const weeklyMeta = await this.userQuestRepo.findActiveByObjective(
      userKey,
      ObjectiveType.QUEST_COMPLETED,
      window.todayStart,
      window.weekStart,
    );
    const tutorialMeta =
      await this.tutorialQuestService.findActiveMeta(userKey);

    const result = await this.processor.executeProgressCycle(
      userKey,
      [...dailyWeeklyActive, ...tutorialActive],
      [...weeklyMeta, ...tutorialMeta],
      context,
      window,
    );

    await this.tutorialQuestService.recordCompletionIfFinished(
      userKey,
      result,
      window,
    );
    await this.userQuestRepo.flush();

    return result;
  }
}
