import { EntityManager } from "@mikro-orm/mysql";
import { Injectable, Logger } from "@nestjs/common";
import { User } from "src/modules/user/user.entity";
import { ObjectiveType, MissionPeriod } from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import { TUTORIAL_EPOCH } from "../mission.constants";
import type { CycleResult } from "../mission.types";
import { MissionRepository } from "../repository/mission.repository";
import { UserMissionRepository } from "../repository/user-mission.repository";

@Injectable()
export class TutorialMissionService {
  private readonly logger = new Logger(TutorialMissionService.name);

  private readonly completedCache = new Set<number>();

  constructor(
    private readonly em: EntityManager,
    private readonly missionRepository: MissionRepository,
    private readonly userMissionRepository: UserMissionRepository,
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

  async findActiveDrawing(userKey: number): Promise<UserMission[]> {
    if (await this.isCompleted(userKey)) return [];
    return this.userMissionRepository.findActiveTutorialDrawing(userKey);
  }

  async findActiveByObjective(
    userKey: number,
    objectiveType: ObjectiveType,
  ): Promise<UserMission[]> {
    if (await this.isCompleted(userKey)) return [];
    return this.userMissionRepository.findActiveTutorialByObjective(
      userKey,
      objectiveType,
    );
  }

  async findActiveMeta(userKey: number): Promise<UserMission[]> {
    if (await this.isCompleted(userKey)) return [];
    return this.userMissionRepository.findActiveTutorialMeta(userKey);
  }

  async ensureTutorialAssigned(userKey: number): Promise<void> {
    const existing =
      await this.userMissionRepository.findTutorialMissions(userKey);
    if (existing.length > 0) return;

    try {
      await this.assignTutorialMissions(userKey);
    } catch (err) {
      if (!this.isDuplicateKeyError(err)) throw err;
    }
  }

  private async assignTutorialMissions(userKey: number): Promise<void> {
    const missions = await this.missionRepository.findTutorial();
    const userRef = this.em.getReference(User, userKey);

    for (const mission of missions) {
      const uq = this.em.create(UserMission, {
        user: userRef,
        mission,
        createdAt: TUTORIAL_EPOCH,
      });
      this.em.persist(uq);
    }

    await this.em.flush();

    this.logger.log(
      {
        event: "mission.tutorial.assign.succeeded",
        userKey,
        count: missions.length,
      },
      "튜토리얼 미션 배정 완료",
    );
  }

  // ─── 완료 판정 — 사이클에서 튜토리얼 완료가 나왔을 때만 ───

  async recordCompletionIfFinished(
    userKey: number,
    result: CycleResult,
    window: MissionWindow,
  ): Promise<void> {
    const tutorialCompleted = [
      ...result.completed,
      ...result.metaCompleted,
    ].some((uq) => uq.mission.period === MissionPeriod.TUTORIAL);
    if (!tutorialCompleted) return;

    const incomplete =
      await this.userMissionRepository.countIncompleteTutorial(userKey);
    if (incomplete > 0) return;

    const user = await this.em.findOne(User, userKey);
    if (!user) return;

    user.tutorialCompletedAt = window.now;
    // completedCache에는 즉시 추가하지 않는다 — 바깥 트랜잭션이 롤백될 수 있으므로
    // 다음 요청의 isCompleted가 DB에서 확인한 뒤 캐시한다.

    this.logger.log(
      { event: "mission.tutorial.completed", userKey },
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
