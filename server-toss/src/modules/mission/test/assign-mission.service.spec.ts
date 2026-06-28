import { Test } from "@nestjs/testing";
import { EntityManager } from "@mikro-orm/mysql";
import {
  Mission,
  MissionPeriod,
  ObjectiveType,
  ProgressPeriod,
  RewardType,
} from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import { AssignMissionService } from "../service/assign-mission.service";

const EM_TOKEN = EntityManager;
const MISSION_REPO_TOKEN = "MissionRepository";
const USER_MISSION_REPO_TOKEN = "UserMissionRepository";

const TODAY_START = new Date("2026-06-18T15:00:00.000Z");
const WEEK_START = new Date("2026-06-15T15:00:00.000Z");

const window = {
  todayStart: TODAY_START,
  todayEnd: new Date("2026-06-19T15:00:00.000Z"),
  weekStart: WEEK_START,
  monthStart: new Date("2026-05-31T15:00:00.000Z"),
  now: new Date("2026-06-19T03:00:00.000Z"),
} as MissionWindow;

const buildMission = (overrides: Partial<Mission> = {}): Mission =>
  ({
    id: BigInt(1),
    title: "테스트 미션",
    period: MissionPeriod.DAILY,
    isFixed: true,
    objectiveType: ObjectiveType.SUBMIT,
    requiredCount: 3,
    threshold: null,
    rewardType: RewardType.POINT,
    rewardAmount: 10,
    progressPeriod: ProgressPeriod.NONE,
    ...overrides,
  }) as Mission;

const buildUserMission = (overrides: Partial<UserMission> = {}): UserMission =>
  ({
    id: BigInt(1),
    user: { userKey: 1 },
    mission: buildMission(),
    currentCount: 0,
    completedAt: null,
    lastProgressedAt: null,
    createdAt: TODAY_START,
    ...overrides,
  }) as unknown as UserMission;

describe("미션 배정 서비스", () => {
  let service: AssignMissionService;
  let missionRepository: Record<string, jest.Mock>;
  let userMissionRepository: Record<string, jest.Mock>;
  let em: Record<string, jest.Mock>;

  beforeEach(async () => {
    em = {
      getReference: jest.fn((_entity, key) => ({ userKey: key })),
      create: jest.fn((_entity, data) => data),
      persist: jest.fn(),
      flush: jest.fn(async () => undefined),
    };
    missionRepository = {
      findFixed: jest.fn(async () => [buildMission()]),
      findRandom: jest.fn(async () => []),
    };
    userMissionRepository = {
      findCurrentMissions: jest.fn(async () => []),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AssignMissionService,
          useFactory: (emVal, missionRepo, userMissionRepo) =>
            new AssignMissionService(emVal, missionRepo, userMissionRepo),
          inject: [EM_TOKEN, MISSION_REPO_TOKEN, USER_MISSION_REPO_TOKEN],
        },
        { provide: EM_TOKEN, useValue: em },
        { provide: MISSION_REPO_TOKEN, useValue: missionRepository },
        { provide: USER_MISSION_REPO_TOKEN, useValue: userMissionRepository },
      ],
    }).compile();

    service = module.get(AssignMissionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("배정된 미션이 없으면", () => {
    it("일일 미션과 주간 미션을 모두 배정한다", async () => {
      await service.ensureMissionsAssigned(1, window);

      expect(missionRepository.findFixed).toHaveBeenCalledWith(
        MissionPeriod.DAILY,
      );
      expect(missionRepository.findFixed).toHaveBeenCalledWith(
        MissionPeriod.WEEKLY,
      );
      expect(em.flush).toHaveBeenCalled();
    });
  });

  describe("주간 미션만 존재하면", () => {
    it("일일 미션만 배정한다", async () => {
      userMissionRepository.findCurrentMissions.mockResolvedValue([
        buildUserMission({
          mission: buildMission({ period: MissionPeriod.WEEKLY }),
          createdAt: WEEK_START,
        }),
      ]);

      await service.ensureMissionsAssigned(1, window);

      expect(missionRepository.findFixed).toHaveBeenCalledWith(
        MissionPeriod.DAILY,
      );
      expect(missionRepository.findFixed).not.toHaveBeenCalledWith(
        MissionPeriod.WEEKLY,
      );
    });
  });

  describe("일일 미션만 존재하면", () => {
    it("주간 미션만 배정한다", async () => {
      userMissionRepository.findCurrentMissions.mockResolvedValue([
        buildUserMission({
          mission: buildMission({ period: MissionPeriod.DAILY }),
        }),
      ]);

      await service.ensureMissionsAssigned(1, window);

      expect(missionRepository.findFixed).not.toHaveBeenCalledWith(
        MissionPeriod.DAILY,
      );
      expect(missionRepository.findFixed).toHaveBeenCalledWith(
        MissionPeriod.WEEKLY,
      );
    });
  });

  describe("일일 미션과 주간 미션이 모두 존재하면", () => {
    it("새로운 미션을 배정하지 않는다", async () => {
      userMissionRepository.findCurrentMissions.mockResolvedValue([
        buildUserMission({
          mission: buildMission({ period: MissionPeriod.DAILY }),
        }),
        buildUserMission({
          mission: buildMission({ period: MissionPeriod.WEEKLY }),
          createdAt: WEEK_START,
        }),
      ]);

      await service.ensureMissionsAssigned(1, window);

      expect(missionRepository.findFixed).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe("동시 요청으로 중복 키 에러가 발생하면", () => {
    it("ER_DUP_ENTRY는 무시한다", async () => {
      const dupError = Object.assign(new Error("Duplicate entry"), {
        code: "ER_DUP_ENTRY",
      });
      em.flush.mockRejectedValue(dupError);

      await expect(
        service.ensureMissionsAssigned(1, window),
      ).resolves.toBeUndefined();
    });
  });

  describe("중복 키가 아닌 에러가 발생하면", () => {
    it("에러를 다시 throw한다", async () => {
      em.flush.mockRejectedValue(new Error("Connection lost"));

      await expect(service.ensureMissionsAssigned(1, window)).rejects.toThrow(
        "Connection lost",
      );
    });
  });
});
