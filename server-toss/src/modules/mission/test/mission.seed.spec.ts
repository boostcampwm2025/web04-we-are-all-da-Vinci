import { REWARD_POINT } from "@toss/shared";
import {
  ObjectiveType,
  ProgressPeriod,
  Mission,
  MissionPeriod,
  RewardType,
} from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import {
  MissionSeedService,
  type MissionDefinition,
} from "../service/mission.seed";

const buildMission = (overrides: Partial<Mission> = {}): Mission =>
  ({
    id: BigInt(1),
    title: "테스트 미션",
    period: MissionPeriod.DAILY,
    isFixed: true,
    objectiveType: ObjectiveType.SUBMIT,
    requiredCount: 1,
    threshold: undefined,
    rewardType: RewardType.POINT,
    rewardAmount: REWARD_POINT,
    progressPeriod: ProgressPeriod.NONE,
    ...overrides,
  }) as Mission;

const buildDef = (
  overrides: Partial<MissionDefinition> = {},
): MissionDefinition => ({
  title: "테스트 미션",
  period: MissionPeriod.DAILY,
  isFixed: true,
  objectiveType: ObjectiveType.SUBMIT,
  requiredCount: 1,
  threshold: null,
  rewardType: RewardType.POINT,
  rewardAmount: REWARD_POINT,
  progressPeriod: ProgressPeriod.NONE,
  ...overrides,
});

const setup = (
  existingMissions: Mission[] = [],
  userMissionCounts: Map<bigint, number> = new Map(),
) => {
  const persisted: unknown[] = [];
  const removed: unknown[] = [];

  const missionRepo = {
    findAll: jest.fn(async () => existingMissions),
  };
  const userMissionRepo = {
    count: jest.fn(
      async ({ mission }: { mission: Mission }) =>
        userMissionCounts.get(mission.id) ?? 0,
    ),
  };

  const txEm = {
    persist: jest.fn((e: unknown) => {
      persisted.push(e);
    }),
    remove: jest.fn((e: unknown) => {
      removed.push(e);
    }),
    flush: jest.fn(async () => undefined),
    getRepository: jest.fn((cls: unknown) => {
      if (cls === Mission) return missionRepo;
      if (cls === UserMission) return userMissionRepo;
    }),
  };

  const em = {
    fork: jest.fn(() => ({
      transactional: jest.fn(async (cb: (em: typeof txEm) => Promise<void>) =>
        cb(txEm),
      ),
    })),
  };

  const service = new MissionSeedService(em as never);
  return { service, persisted, removed, txEm, missionRepo, userMissionRepo };
};

describe("미션 시드 서비스", () => {
  describe("미션 동기화", () => {
    it("빈 DB에서 JSON 항목 전체를 삽입한다", async () => {
      const { service, persisted } = setup();

      const data = [
        buildDef({ title: "그림 제출하기" }),
        buildDef({
          title: "80점 이상 받기",
          objectiveType: ObjectiveType.SCORE,
          threshold: 80,
        }),
      ];

      const result = await service.syncMissions(data);

      expect(result.added).toBe(2);
      expect(result.deleted).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.protected).toBe(0);
      expect(persisted).toHaveLength(2);
    });

    it("user_mission 없는 기존 미션은 삭제한다", async () => {
      const orphan = buildMission({ id: BigInt(99), title: "삭제될 미션" });
      const { service, removed } = setup([orphan]);

      const result = await service.syncMissions([
        buildDef({ title: "새 미션" }),
      ]);

      expect(result.deleted).toBe(1);
      expect(removed).toContain(orphan);
      expect(result.added).toBe(1);
    });

    it("user_mission 있는 기존 미션은 보존한다", async () => {
      const protectedMission = buildMission({
        id: BigInt(10),
        title: "보존될 미션",
      });
      const counts = new Map([[BigInt(10), 3]]);
      const { service, removed } = setup([protectedMission], counts);

      const result = await service.syncMissions([
        buildDef({ title: "새 미션" }),
      ]);

      expect(result.protected).toBe(1);
      expect(result.deleted).toBe(0);
      expect(removed).not.toContain(protectedMission);
    });

    it("JSON에 있는 기존 미션의 필드를 업데이트한다", async () => {
      const existing = buildMission({
        id: BigInt(1),
        title: "그림 제출하기",
        requiredCount: 1,
      });
      const { service } = setup([existing]);

      const result = await service.syncMissions([
        buildDef({ title: "그림 제출하기", requiredCount: 3 }),
      ]);

      expect(result.updated).toBe(1);
      expect(result.added).toBe(0);
      expect(existing.requiredCount).toBe(3);
    });

    it("포인트 미션의 양수 보상액을 REWARD_POINT로 정규화해 저장한다", async () => {
      const { service, persisted } = setup();

      await service.syncMissions([
        buildDef({
          title: "비정규 보상 미션",
          rewardType: RewardType.POINT,
          rewardAmount: 999,
        }),
      ]);

      expect((persisted[0] as Mission).rewardAmount).toBe(REWARD_POINT);
    });

    it("보상 없는(0) 포인트 미션은 0을 유지한다", async () => {
      const { service, persisted } = setup();

      await service.syncMissions([
        buildDef({
          title: "보상 없는 미션",
          rewardType: RewardType.POINT,
          rewardAmount: 0,
        }),
      ]);

      expect((persisted[0] as Mission).rewardAmount).toBe(0);
    });

    it("동일한 데이터면 변경하지 않는다", async () => {
      const existing = buildMission({ id: BigInt(1), title: "그림 제출하기" });
      const { service } = setup([existing]);

      const result = await service.syncMissions([
        buildDef({ title: "그림 제출하기" }),
      ]);

      expect(result.updated).toBe(0);
      expect(result.added).toBe(0);
      expect(result.deleted).toBe(0);
    });
  });
});
