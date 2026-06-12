import { LockMode } from "@mikro-orm/core";
import { EntityRepository } from "@mikro-orm/mysql";
import { User } from "src/modules/user/user.entity";
import { ObjectiveType, QuestPeriod } from "../entity/quest.entity";
import type { Quest } from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";

export class UserQuestRepository extends EntityRepository<UserQuest> {
  async findCurrentQuests(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        $or: [
          { quest: { period: QuestPeriod.DAILY }, createdAt: todayStart },
          { quest: { period: QuestPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["quest"] },
    );
  }

  async findActiveByObjective(
    userKey: number,
    objectiveType: ObjectiveType,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        quest: { objectiveType },
        $or: [
          { quest: { period: QuestPeriod.DAILY }, createdAt: todayStart },
          { quest: { period: QuestPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["quest"] },
    );
  }

  createForUser(userKey: number, quest: Quest, periodStart: Date): UserQuest {
    const userRef = this.getEntityManager().getReference(User, userKey);
    const uq = this.create({ user: userRef, quest, createdAt: periodStart });
    this.em.persist(uq);
    return uq;
  }

  async findActiveDrawingQuests(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        quest: {
          objectiveType: {
            $nin: [
              ObjectiveType.QUEST_COMPLETED,
              ObjectiveType.TUTORIAL_COMPLETED,
            ],
          },
        },
        $or: [
          { quest: { period: QuestPeriod.DAILY }, createdAt: todayStart },
          { quest: { period: QuestPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["quest"] },
    );
  }

  async findTutorialQuests(userKey: number): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        quest: { period: QuestPeriod.TUTORIAL },
      },
      { populate: ["quest"] },
    );
  }

  async findActiveTutorialByObjective(
    userKey: number,
    objectiveType: ObjectiveType,
  ): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        quest: { period: QuestPeriod.TUTORIAL, objectiveType },
      },
      { populate: ["quest"] },
    );
  }

  async findActiveTutorialMeta(userKey: number): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        quest: {
          period: QuestPeriod.TUTORIAL,
          objectiveType: ObjectiveType.TUTORIAL_COMPLETED,
        },
      },
      { populate: ["quest"] },
    );
  }

  /** 그림 제출 이벤트가 진행시키는 튜토리얼 퀘스트 (SUBMIT/SCORE) */
  async findActiveTutorialDrawing(userKey: number): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        quest: {
          period: QuestPeriod.TUTORIAL,
          objectiveType: { $in: [ObjectiveType.SUBMIT, ObjectiveType.SCORE] },
        },
      },
      { populate: ["quest"] },
    );
  }

  async countIncompleteTutorial(userKey: number): Promise<number> {
    return this.count({
      user: { userKey },
      completedAt: null,
      quest: { period: QuestPeriod.TUTORIAL },
    });
  }

  /**
   * 진행 사이클 진입 시 유저의 활성 퀘스트 행을 한 번에 잠근다(직렬화 + 현재값 보장).
   * 같은 유저의 동시 요청이 임계구역을 하나씩 통과하게 해 currentCount 유실/이중완료를 막는다.
   * populate 없이 user_quests만 잠가 공유 quests 마스터 행을 잠그지 않는다.
   */
  async lockActiveForUpdate(userKey: number): Promise<void> {
    await this.find(
      { user: { userKey }, completedAt: null },
      {
        lockMode: LockMode.PESSIMISTIC_WRITE,
        refresh: true, // 식별 맵의 스냅샷 값을 DB 현재값으로 덮어씀
        orderBy: { id: "asc" }, // 항상 같은 순서로 잠가 데드락 방지
      },
    );
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }
}
