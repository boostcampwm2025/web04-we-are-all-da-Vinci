import { EntityManager } from "@mikro-orm/mysql";
import { Injectable, Logger } from "@nestjs/common";
import { User } from "src/modules/user/user.entity";
import { MissionPeriod } from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { CHALLENGE_EPOCH } from "../mission.constants";
import type { CycleResult } from "../mission.types";
import { MissionRepository } from "../repository/mission.repository";
import { UserMissionRepository } from "../repository/user-mission.repository";

@Injectable()
export class ChallengeMissionService {
  private readonly logger = new Logger(ChallengeMissionService.name);

  private readonly assignedCache = new Set<number>();

  constructor(
    private readonly em: EntityManager,
    private readonly missionRepository: MissionRepository,
    private readonly userMissionRepository: UserMissionRepository,
  ) {}

  async ensureAssigned(userKey: number): Promise<void> {
    if (this.assignedCache.has(userKey)) return;

    const existing =
      await this.userMissionRepository.findChallengeMissions(userKey);
    if (existing.length > 0) {
      this.assignedCache.add(userKey);
      return;
    }

    try {
      await this.assignChallengeMissions(userKey);
    } catch (err) {
      if (!this.isDuplicateKeyError(err)) throw err;
    }
    this.assignedCache.add(userKey);
  }

  async findActiveDrawing(userKey: number): Promise<UserMission[]> {
    return this.userMissionRepository.findActiveChallengeMissions(userKey);
  }

  async findAll(userKey: number): Promise<UserMission[]> {
    return this.userMissionRepository.findChallengeMissions(userKey);
  }

  resetCompletedForNextTier(result: CycleResult): void {
    const challengeCompleted = [
      ...result.completed,
      ...result.metaCompleted,
    ].filter((uq) => uq.mission.period === MissionPeriod.CONTINUOUSLY);

    for (const uq of challengeCompleted) {
      const step = uq.mission.incrementStep;
      if (step == null) continue;

      const prevRequired = uq.requiredCount ?? uq.mission.requiredCount;
      uq.requiredCount = prevRequired + step;
      uq.currentCount = 0;
      uq.level += 1;
      uq.completedAt = undefined;

      this.logger.log(
        {
          event: "mission.challenge.tier_up.succeeded",
          userKey: uq.user.userKey,
          missionId: uq.mission.id.toString(),
          level: uq.level,
          nextRequired: uq.requiredCount,
        },
        "도전 미션 티어 업",
      );
    }
  }

  private async assignChallengeMissions(userKey: number): Promise<void> {
    const missions = await this.missionRepository.findChallenge();
    const userRef = this.em.getReference(User, userKey);

    for (const mission of missions) {
      const uq = this.em.create(UserMission, {
        user: userRef,
        mission,
        createdAt: CHALLENGE_EPOCH,
      });
      this.em.persist(uq);
    }

    await this.em.flush();

    this.logger.log(
      {
        event: "mission.challenge.assign.succeeded",
        userKey,
        count: missions.length,
      },
      "도전 미션 배정 완료",
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
