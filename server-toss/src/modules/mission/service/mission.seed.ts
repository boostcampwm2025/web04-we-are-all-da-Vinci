import { EntityManager } from "@mikro-orm/core";
import { Injectable, Logger } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import {
  ObjectiveType,
  ProgressPeriod,
  Mission,
  MissionPeriod,
  RewardType,
} from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { REWARD_POINT } from "../../point/point.contants";

const MissionDefinitionSchema = z.object({
  title: z.string().min(1).max(50),
  period: z.enum(MissionPeriod),
  isFixed: z.boolean(),
  objectiveType: z.enum(ObjectiveType),
  requiredCount: z.number().int().positive(),
  threshold: z.number().int().nullable().default(null),
  rewardType: z.enum(RewardType),
  rewardAmount: z.number().int().min(0),
  category: z.string().max(20).nullable().default(null),
  progressPeriod: z.enum(ProgressPeriod).default(ProgressPeriod.NONE),
});

const MissionsFileSchema = z
  .array(MissionDefinitionSchema)
  .refine(
    (missions) =>
      new Set(missions.map((q) => q.title)).size === missions.length,
    { message: "미션 제목이 중복됩니다" },
  )
  .refine(
    (missions) =>
      new Set(missions.map(missionNaturalKey)).size === missions.length,
    {
      message: "미션 자연 키(period+objectiveType+category)가 중복됩니다",
    },
  );

export type MissionDefinition = z.infer<typeof MissionDefinitionSchema>;

// 미션의 안정 식별자. title·requiredCount·threshold는 리워딩/튜닝으로 바뀌므로
// 식별자에서 제외하고, 슬롯을 규정하는 (period, objectiveType, category)만 쓴다.
// 이 키로 시드를 매칭해야 제목/수치 변경 시 새 행을 만들지 않고 제자리 업데이트한다.
const missionNaturalKey = (m: {
  period: MissionPeriod;
  objectiveType: ObjectiveType;
  category?: string | null;
}): string => `${m.period}|${m.objectiveType}|${m.category ?? ""}`;

// missions.json의 rewardAmount는 "0=보상 없음 / 양수=표준 보상"의 on/off 플래그로만 쓰고,
// 실제 지급액은 단일 소스 REWARD_POINT로 정규화한다(포인트 보상에 한함).
const resolveRewardAmount = (def: MissionDefinition): number =>
  def.rewardType === RewardType.POINT && def.rewardAmount > 0
    ? REWARD_POINT
    : def.rewardAmount;

export interface MissionSeedResult {
  added: number;
  updated: number;
  deleted: number;
  protected: number;
}

@Injectable()
export class MissionSeedService {
  private readonly logger = new Logger(MissionSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async run(): Promise<MissionSeedResult> {
    const data = await this.loadMissions();
    const result = await this.syncMissions(data);
    this.logger.log(
      { event: "mission.seed.completed", ...result },
      "미션 시드 완료",
    );
    return result;
  }

  async syncMissions(data: MissionDefinition[]): Promise<MissionSeedResult> {
    const em = this.em.fork();
    let added = 0;
    let updated = 0;
    let deleted = 0;
    let protectedCount = 0;

    await em.transactional(async (txEm) => {
      const missionRepo = txEm.getRepository(Mission);
      const userMissionRepo = txEm.getRepository(UserMission);

      const allMissions = await missionRepo.findAll();
      const jsonKeys = new Set(data.map(missionNaturalKey));

      for (const mission of allMissions) {
        if (jsonKeys.has(missionNaturalKey(mission))) continue;

        const userMissionCount = await userMissionRepo.count({ mission });

        if (userMissionCount > 0) {
          protectedCount++;
          this.logger.log(
            {
              event: "mission.seed.protected",
              missionId: String(mission.id),
              title: mission.title,
            },
            `미션 보존 (user_mission 있음): ${mission.title}`,
          );
        } else {
          txEm.remove(mission);
          deleted++;
          this.logger.log(
            {
              event: "mission.seed.deleted",
              missionId: String(mission.id),
              title: mission.title,
            },
            `미션 삭제: ${mission.title}`,
          );
        }
      }

      await txEm.flush();

      // 자연 키 → 기존 미션. 중복 행이 남아 있으면 가장 오래된(먼저 조회된) 행을
      // canonical로 삼는다(복구 마이그레이션의 MIN(id) 선택과 일치).
      const existingByKey = new Map<string, Mission>();
      for (const mission of allMissions) {
        const key = missionNaturalKey(mission);
        if (!jsonKeys.has(key)) continue;
        if (!existingByKey.has(key)) existingByKey.set(key, mission);
      }

      for (const def of data) {
        const existing = existingByKey.get(missionNaturalKey(def));

        if (existing) {
          if (this.applyChanges(existing, def)) {
            updated++;
            this.logger.log(
              {
                event: "mission.seed.updated",
                missionId: String(existing.id),
                title: def.title,
              },
              `미션 업데이트: ${def.title}`,
            );
          }
        } else {
          const mission = new Mission();
          mission.title = def.title;
          mission.period = def.period;
          mission.isFixed = def.isFixed;
          mission.objectiveType = def.objectiveType;
          mission.requiredCount = def.requiredCount;
          mission.threshold = def.threshold ?? undefined;
          mission.rewardType = def.rewardType;
          mission.rewardAmount = resolveRewardAmount(def);
          mission.category = def.category ?? undefined;
          mission.progressPeriod = def.progressPeriod;
          txEm.persist(mission);
          added++;
          this.logger.log(
            { event: "mission.seed.added", title: def.title },
            `미션 추가: ${def.title}`,
          );
        }
      }

      await txEm.flush();
    });

    return { added, updated, deleted, protected: protectedCount };
  }

  private applyChanges(mission: Mission, def: MissionDefinition): boolean {
    let changed = false;
    // title은 더 이상 매칭 키가 아니므로(자연 키로 매칭) 제자리에서 동기화한다.
    if (mission.title !== def.title) {
      mission.title = def.title;
      changed = true;
    }
    if (mission.period !== def.period) {
      mission.period = def.period;
      changed = true;
    }
    if (mission.isFixed !== def.isFixed) {
      mission.isFixed = def.isFixed;
      changed = true;
    }
    if (mission.objectiveType !== def.objectiveType) {
      mission.objectiveType = def.objectiveType;
      changed = true;
    }
    if (mission.requiredCount !== def.requiredCount) {
      mission.requiredCount = def.requiredCount;
      changed = true;
    }
    if (mission.threshold !== (def.threshold ?? undefined)) {
      mission.threshold = def.threshold ?? undefined;
      changed = true;
    }
    if (mission.rewardType !== def.rewardType) {
      mission.rewardType = def.rewardType;
      changed = true;
    }
    const resolvedRewardAmount = resolveRewardAmount(def);
    if (mission.rewardAmount !== resolvedRewardAmount) {
      mission.rewardAmount = resolvedRewardAmount;
      changed = true;
    }
    if (mission.category !== (def.category ?? undefined)) {
      mission.category = def.category ?? undefined;
      changed = true;
    }
    if (mission.progressPeriod !== def.progressPeriod) {
      mission.progressPeriod = def.progressPeriod;
      changed = true;
    }
    return changed;
  }

  private async loadMissions(): Promise<MissionDefinition[]> {
    const missionPath = path.join(process.cwd(), "data", "missions.json");
    const raw = await readFile(missionPath, "utf-8");
    return MissionsFileSchema.parse(JSON.parse(raw));
  }
}
