import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { Mission, MissionPeriod } from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import { DAILY_RANDOM_COUNT, WEEKLY_RANDOM_COUNT } from "../mission.constants";
import { MissionRepository } from "../repository/mission.repository";
import { UserMissionRepository } from "../repository/user-mission.repository";

// 미션 슬롯 식별자(시드의 자연 키와 동일 개념, period는 호출 단위로 고정).
const objectiveKey = (mission: Mission): string =>
  `${mission.objectiveType}|${mission.category ?? ""}`;

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
    // 같은 미션 슬롯(objectiveType+category)의 행이 데이터상 중복돼 있어도 하루에
    // 한 번만 배정되도록 방어적으로 중복을 제거한다(고정 우선, 랜덤 풀 오염 방지).
    const fixedMissions = this.dedupeByObjective(
      await this.missionRepository.findFixed(period),
    );
    const fixedKeys = new Set(fixedMissions.map((m) => objectiveKey(m)));
    const randomMissions = this.dedupeByObjective(
      await this.missionRepository.findRandom(period),
    ).filter((mission) => !fixedKeys.has(objectiveKey(mission)));

    const selected = [
      ...fixedMissions,
      ...this.pickRandom(randomMissions, randomCount),
    ];

    return selected.map((mission) =>
      this.userMissionRepository.createForUser(userKey, mission, periodStart),
    );
  }

  private dedupeByObjective(missions: Mission[]): Mission[] {
    const seen = new Set<string>();
    return missions.filter((mission) => {
      const key = objectiveKey(mission);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
