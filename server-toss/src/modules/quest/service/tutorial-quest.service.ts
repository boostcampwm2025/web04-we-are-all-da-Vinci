import { EntityManager } from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { User } from "src/modules/user/user.entity";
import { ObjectiveType, Quest, QuestPeriod } from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";
import { QuestWindow } from "../quest-window";
import { TUTORIAL_EPOCH } from "../quest.constants";
import type { CycleResult } from "../quest.types";
import { QuestRepository } from "../repository/quest.repository";
import { UserQuestRepository } from "../repository/user-quest.repository";

@Injectable()
export class TutorialQuestService {
  private readonly logger = new Logger(TutorialQuestService.name);

  // 튜토리얼이 끝난 유저를 캐시
  // 유저 액션에 반복해서 튜토리얼을 체크하는 동작을 방지하기 위함.
  private readonly completedCache = new Set<number>();

  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: QuestRepository,
    @InjectRepository(UserQuest)
    private readonly userQuestRepository: UserQuestRepository,
    private readonly em: EntityManager,
  ) {}

  // ─── 완료 게이트 ───

  async isCompleted(userKey: number): Promise<boolean> {
    if (this.completedCache.has(userKey)) return true;

    const user = await this.em.findOne(User, userKey);
    if (user?.tutorialCompletedAt != null) {
      this.completedCache.add(userKey);
      return true;
    }
    return false;
  }

  async findActiveDrawing(userKey: number): Promise<UserQuest[]> {
    if (await this.isCompleted(userKey)) return [];
    return this.userQuestRepository.findActiveTutorialDrawing(userKey);
  }

  async findActiveByObjective(
    userKey: number,
    objectiveType: ObjectiveType,
  ): Promise<UserQuest[]> {
    if (await this.isCompleted(userKey)) return [];
    return this.userQuestRepository.findActiveTutorialByObjective(
      userKey,
      objectiveType,
    );
  }

  async findActiveMeta(userKey: number): Promise<UserQuest[]> {
    if (await this.isCompleted(userKey)) return [];
    return this.userQuestRepository.findActiveTutorialMeta(userKey);
  }

  async ensureTutorialAssigned(userKey: number): Promise<void> {
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

  // ─── 완료 판정 — 사이클에서 튜토리얼 완료가 나왔을 때만 ───

  async recordCompletionIfFinished(
    userKey: number,
    result: CycleResult,
    window: QuestWindow,
  ): Promise<void> {
    const tutorialCompleted = [
      ...result.completed,
      ...result.metaCompleted,
    ].some((uq) => uq.quest.period === QuestPeriod.TUTORIAL);
    if (!tutorialCompleted) return;

    const incomplete =
      await this.userQuestRepository.countIncompleteTutorial(userKey);
    if (incomplete > 0) return;

    const user = await this.em.findOne(User, userKey);
    if (!user) return;

    user.tutorialCompletedAt = window.now;
    // completedCache에는 즉시 추가하지 않는다 — 바깥 트랜잭션이 롤백될 수 있으므로
    // 다음 요청의 isCompleted가 DB에서 확인한 뒤 캐시한다.

    this.logger.log(
      { event: "quest.tutorial.completed", userKey },
      "튜토리얼 전체 완료",
    );
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "ER_DUP_ENTRY"
    );
  }
}
