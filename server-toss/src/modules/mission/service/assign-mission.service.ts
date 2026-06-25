import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { Mission, MissionPeriod } from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import { DAILY_RANDOM_COUNT, WEEKLY_RANDOM_COUNT } from "../mission.constants";
import { MissionRepository } from "../repository/mission.repository";
import { UserMissionRepository } from "../repository/user-mission.repository";

@Injectable()
export class AssignMissionService {
  private readonly logger = new Logger(AssignMissionService.name);
  constructor(
    @InjectRepository(Mission)
    private readonly missionRepository: MissionRepository,
    @InjectRepository(UserMission)
    private readonly userMissionRepository: UserMissionRepository,
  ) {}

  async ensureMissionsAssigned(
    userKey: number,
    window: MissionWindow,
  ): Promise<void> {
    const { todayStart, weekStart } = window;

    const existing = await this.userMissionRepository.findCurrentMissions(
      userKey,
      todayStart,
      weekStart,
    );

    const hasDaily = existing.some(
      (um) => um.mission.period === MissionPeriod.DAILY,
    );
    const hasWeekly = existing.some(
      (um) => um.mission.period === MissionPeriod.WEEKLY,
    );

    if (hasDaily && hasWeekly) return;

    try {
      await this.assignNewMissions(
        userKey,
        todayStart,
        weekStart,
        !hasDaily,
        !hasWeekly,
      );
    } catch (err) {
      if (!this.isDuplicateKeyError(err)) throw err;
    }
  }

  @Transactional()
  private async assignNewMissions(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
    needsDaily: boolean,
    needsWeekly: boolean,
  ): Promise<UserMission[]> {
    const dailyMissions = needsDaily
      ? await this.assignMissions(
          userKey,
          MissionPeriod.DAILY,
          todayStart,
          DAILY_RANDOM_COUNT,
        )
      : [];
    const weeklyMissions = needsWeekly
      ? await this.assignMissions(
          userKey,
          MissionPeriod.WEEKLY,
          weekStart,
          WEEKLY_RANDOM_COUNT,
        )
      : [];

    const all = [...dailyMissions, ...weeklyMissions];
    if (all.length > 0) {
      await this.userMissionRepository.flush();
    }

    this.logger.log(
      {
        event: "mission.assign.succeeded",
        userKey,
        dailyCount: dailyMissions.length,
        weeklyCount: weeklyMissions.length,
      },
      "미션 배정 완료",
    );

    return all;
  }

  private async assignMissions(
    userKey: number,
    period: MissionPeriod,
    periodStart: Date,
    randomCount: number,
  ): Promise<UserMission[]> {
    const fixedMissions = await this.missionRepository.findFixed(period);
    const randomMissions = await this.missionRepository.findRandom(period);

    const selected = [
      ...fixedMissions,
      ...this.pickRandom(randomMissions, randomCount),
    ];

    return selected.map((mission) =>
      this.userMissionRepository.createForUser(userKey, mission, periodStart),
    );
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "ER_DUP_ENTRY"
    );
  }

  private pickRandom<T>(items: T[], count: number): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count);
  }
}
