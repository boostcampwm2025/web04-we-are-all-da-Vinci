import { LockMode } from "@mikro-orm/core";
import { EntityRepository } from "@mikro-orm/mysql";
import { User } from "src/modules/user/user.entity";
import { ObjectiveType, MissionPeriod } from "../entity/mission.entity";
import type { Mission } from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";

export class UserMissionRepository extends EntityRepository<UserMission> {
  async findCurrentMissions(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserMission[]> {
    return this.find(
      {
        user: { userKey },
        $or: [
          { mission: { period: MissionPeriod.DAILY }, createdAt: todayStart },
          { mission: { period: MissionPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["mission"] },
    );
  }

  /** 대시보드 카드용 — 오늘 배정된 일일 미션만 (경량 조회, 순수 read) */
  async findTodayDailyMissions(
    userKey: number,
    todayStart: Date,
  ): Promise<UserMission[]> {
    return this.find(
      {
        user: { userKey },
        mission: { period: MissionPeriod.DAILY },
        createdAt: todayStart,
      },
      { populate: ["mission"] },
    );
  }

  async findActiveByObjective(
    userKey: number,
    objectiveType: ObjectiveType,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserMission[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        mission: { objectiveType },
        $or: [
          { mission: { period: MissionPeriod.DAILY }, createdAt: todayStart },
          { mission: { period: MissionPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["mission"] },
    );
  }

  createForUser(
    userKey: number,
    mission: Mission,
    periodStart: Date,
  ): UserMission {
    const userRef = this.getEntityManager().getReference(User, userKey);
    const uq = this.create({ user: userRef, mission, createdAt: periodStart });
    this.em.persist(uq);
    return uq;
  }

  async findActiveDrawingMissions(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserMission[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        mission: {
          objectiveType: {
            $nin: [
              ObjectiveType.MISSION_COMPLETED,
              ObjectiveType.TUTORIAL_COMPLETED,
            ],
          },
        },
        $or: [
          { mission: { period: MissionPeriod.DAILY }, createdAt: todayStart },
          { mission: { period: MissionPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["mission"] },
    );
  }

  async findTutorialMissions(userKey: number): Promise<UserMission[]> {
    return this.find(
      {
        user: { userKey },
        mission: { period: MissionPeriod.TUTORIAL },
      },
      { populate: ["mission"] },
    );
  }

  async findActiveTutorialByObjective(
    userKey: number,
    objectiveType: ObjectiveType,
  ): Promise<UserMission[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        mission: { period: MissionPeriod.TUTORIAL, objectiveType },
      },
      { populate: ["mission"] },
    );
  }

  async findActiveTutorialMeta(userKey: number): Promise<UserMission[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        mission: {
          period: MissionPeriod.TUTORIAL,
          objectiveType: ObjectiveType.TUTORIAL_COMPLETED,
        },
      },
      { populate: ["mission"] },
    );
  }

  /** 그림 제출 이벤트가 진행시키는 튜토리얼 미션 (SUBMIT/SCORE) */
  async findActiveTutorialDrawing(userKey: number): Promise<UserMission[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        mission: {
          period: MissionPeriod.TUTORIAL,
          objectiveType: { $in: [ObjectiveType.SUBMIT, ObjectiveType.SCORE] },
        },
      },
      { populate: ["mission"] },
    );
  }

  async countIncompleteTutorial(userKey: number): Promise<number> {
    return this.count({
      user: { userKey },
      completedAt: null,
      mission: { period: MissionPeriod.TUTORIAL },
    });
  }

  /**
   * 진행 사이클 진입 시 유저의 활성 미션 행을 한 번에 잠근다(직렬화 + 현재값 보장).
   * 같은 유저의 동시 요청이 임계구역을 하나씩 통과하게 해 currentCount 유실/이중완료를 막는다.
   * populate 없이 user_missions만 잠가 공유 missions 마스터 행을 잠그지 않는다.
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
