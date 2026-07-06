import type { EntityManager } from "@mikro-orm/core";
import {
  MissionPeriod,
  ObjectiveType,
  type Mission,
} from "../entity/mission.entity";
import type { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import { CHALLENGE_EPOCH } from "../mission.constants";
import type { CycleResult } from "../mission.types";
import type { MissionRepository } from "../repository/mission.repository";
import type { UserMissionRepository } from "../repository/user-mission.repository";
import { ChallengeMissionService } from "../service/challenge-mission.service";
import type { MissionProcessor } from "../service/mission.processor";

const USER_KEY = 1234;

const buildWindow = (): MissionWindow =>
  new MissionWindow(
    new Date("2026-06-09T15:00:00.000Z"),
    new Date("2026-06-10T15:00:00.000Z"),
    new Date("2026-06-07T15:00:00.000Z"),
    new Date("2026-05-31T15:00:00.000Z"),
    new Date("2026-06-10T12:00:00.000Z"),
  );

const buildMission = (overrides: Partial<Mission> = {}): Mission =>
  ({
    id: BigInt(1),
    title: "도전! 그림 그리기",
    period: MissionPeriod.CONTINUOUSLY,
    isFixed: true,
    objectiveType: ObjectiveType.SUBMIT,
    requiredCount: 15,
    incrementStep: 15,
    ...overrides,
  }) as Mission;

const buildUserMission = (overrides: Partial<UserMission> = {}): UserMission =>
  ({
    id: BigInt(1),
    user: { userKey: USER_KEY },
    mission: buildMission(),
    currentCount: 15,
    requiredCount: null,
    level: 0,
    completedAt: new Date("2026-06-10T12:00:00.000Z"),
    lastProgressedAt: null,
    createdAt: CHALLENGE_EPOCH,
    ...overrides,
  }) as unknown as UserMission;

describe("ChallengeMissionService", () => {
  let service: ChallengeMissionService;
  let em: Record<string, jest.Mock>;
  let missionRepository: Record<string, jest.Mock>;
  let userMissionRepository: Record<string, jest.Mock>;
  let processor: Record<string, jest.Mock>;

  beforeEach(() => {
    em = {
      getReference: jest.fn((_entity, key) => ({ userKey: key })),
      create: jest.fn((_entity, data) => data),
      persist: jest.fn(),
      flush: jest.fn(async () => undefined),
    };
    missionRepository = {
      findChallenge: jest.fn(async () => [buildMission()]),
    };
    userMissionRepository = {
      findChallengeMissions: jest.fn(async () => []),
      findActiveChallengeMissions: jest.fn(async () => []),
    };
    processor = {
      executeProgressCycle: jest.fn(() => ({
        completed: [],
        metaCompleted: [],
      })),
    };

    service = new ChallengeMissionService(
      em as unknown as EntityManager,
      missionRepository as unknown as MissionRepository,
      userMissionRepository as unknown as UserMissionRepository,
      processor as unknown as MissionProcessor,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe("ensureAssigned", () => {
    it("이미 보유 중이면 배정하지 않는다", async () => {
      userMissionRepository.findChallengeMissions.mockResolvedValue([
        buildUserMission(),
      ]);

      await service.ensureAssigned(USER_KEY);

      expect(missionRepository.findChallenge).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it("보유 중인 도전 미션이 없으면 마스터 전체를 CHALLENGE_EPOCH로 배정한다", async () => {
      const missions = [
        buildMission({ id: BigInt(1) }),
        buildMission({ id: BigInt(2) }),
      ];
      missionRepository.findChallenge.mockResolvedValue(missions);

      await service.ensureAssigned(USER_KEY);

      expect(em.create).toHaveBeenCalledTimes(2);
      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ createdAt: CHALLENGE_EPOCH }),
      );
      expect(em.persist).toHaveBeenCalledTimes(2);
      expect(em.flush).toHaveBeenCalled();
    });

    it("배정 후 재호출하면 캐시로 인해 조회조차 하지 않는다", async () => {
      await service.ensureAssigned(USER_KEY);
      userMissionRepository.findChallengeMissions.mockClear();

      await service.ensureAssigned(USER_KEY);

      expect(
        userMissionRepository.findChallengeMissions,
      ).not.toHaveBeenCalled();
    });

    it("동시 배정으로 중복 키 에러가 발생하면 무시한다", async () => {
      const dupError = Object.assign(new Error("Duplicate entry"), {
        code: "ER_DUP_ENTRY",
      });
      em.flush.mockRejectedValue(dupError);

      await expect(service.ensureAssigned(USER_KEY)).resolves.toBeUndefined();
    });

    it("중복 키가 아닌 에러는 다시 throw한다", async () => {
      em.flush.mockRejectedValue(new Error("Connection lost"));

      await expect(service.ensureAssigned(USER_KEY)).rejects.toThrow(
        "Connection lost",
      );
    });
  });

  describe("processDrawing", () => {
    it("활성 도전 미션으로 진행 사이클을 실행한다", async () => {
      const active = [buildUserMission({ completedAt: null, currentCount: 3 })];
      userMissionRepository.findActiveChallengeMissions.mockResolvedValue(
        active,
      );
      const context = { drawingId: BigInt(1), score: 90, penalty: 0 };
      const window = buildWindow();

      await service.processDrawing(USER_KEY, context, window);

      expect(processor.executeProgressCycle).toHaveBeenCalledWith(
        active,
        [],
        context,
        window,
      );
    });

    it("완료된 도전 미션은 다음 티어로 리셋된다", async () => {
      const completedUq = buildUserMission();
      processor.executeProgressCycle.mockReturnValue({
        completed: [completedUq],
        metaCompleted: [],
      });

      await service.processDrawing(
        USER_KEY,
        { drawingId: BigInt(1), score: 90, penalty: 0 },
        buildWindow(),
      );

      expect(completedUq.requiredCount).toBe(30);
      expect(completedUq.currentCount).toBe(0);
      expect(completedUq.level).toBe(1);
      expect(completedUq.completedAt).toBeUndefined();
    });
  });

  describe("resetCompletedForNextTier", () => {
    it("완료된 도전 미션의 requiredCount를 incrementStep만큼 늘리고 진행도를 리셋한다", () => {
      const uq = buildUserMission({ level: 2, requiredCount: 45 });
      const result: CycleResult = { completed: [uq], metaCompleted: [] };

      service.resetCompletedForNextTier(result);

      expect(uq.requiredCount).toBe(60);
      expect(uq.currentCount).toBe(0);
      expect(uq.level).toBe(3);
      expect(uq.completedAt).toBeUndefined();
    });

    it("requiredCount 오버라이드가 없으면 마스터 requiredCount를 기준으로 늘린다", () => {
      const uq = buildUserMission({ requiredCount: null });
      const result: CycleResult = { completed: [uq], metaCompleted: [] };

      service.resetCompletedForNextTier(result);

      expect(uq.requiredCount).toBe(30);
    });

    it("metaCompleted에 포함된 도전 미션도 동일하게 처리한다", () => {
      const uq = buildUserMission({ requiredCount: 15 });
      const result: CycleResult = { completed: [], metaCompleted: [uq] };

      service.resetCompletedForNextTier(result);

      expect(uq.requiredCount).toBe(30);
      expect(uq.level).toBe(1);
    });

    it("incrementStep이 없는 미션은 건드리지 않는다", () => {
      const uq = buildUserMission({
        requiredCount: 10,
        mission: buildMission({ incrementStep: null }),
      });
      const result: CycleResult = { completed: [uq], metaCompleted: [] };

      service.resetCompletedForNextTier(result);

      expect(uq.requiredCount).toBe(10);
      expect(uq.level).toBe(0);
      expect(uq.completedAt).not.toBeUndefined();
    });

    it("도전 미션이 아닌 완료 항목은 건드리지 않는다", () => {
      const uq = buildUserMission({
        requiredCount: 3,
        mission: buildMission({ period: MissionPeriod.DAILY }),
      });
      const result: CycleResult = { completed: [uq], metaCompleted: [] };

      service.resetCompletedForNextTier(result);

      expect(uq.requiredCount).toBe(3);
      expect(uq.level).toBe(0);
    });
  });
});
