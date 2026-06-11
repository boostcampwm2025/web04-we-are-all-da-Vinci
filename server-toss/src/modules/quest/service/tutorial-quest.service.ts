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

/**
 * 튜토리얼 퀘스트의 할당·완료 게이트를 소유한다.
 *
 * 튜토리얼 완료는 단조(monotonic) 상태 — 한 번 끝나면 다시 안 한다.
 * 완료 시 `user.tutorialCompletedAt`을 기록하고, 프로세스 수명 동안 완료 유저를
 * 메모리 캐시해 hot path에서 튜토리얼 쿼리를 0으로 만든다.
 */
@Injectable()
export class TutorialQuestService {
  private readonly logger = new Logger(TutorialQuestService.name);

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

    // 같은 요청에서 이미 User가 로드됐으면 identity map 히트 (쿼리 0)
    const user = await this.em.findOne(User, userKey);
    if (user?.tutorialCompletedAt != null) {
      this.completedCache.add(userKey);
      return true;
    }
    return false;
  }

  // ─── 게이트드 read — 완료 유저는 쿼리 없이 [] ───

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

  // ─── 할당 (가입 시 1회) ───

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
