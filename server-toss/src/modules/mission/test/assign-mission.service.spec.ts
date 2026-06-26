import { Test } from "@nestjs/testing";
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

  beforeEach(async () => {
    missionRepository = {
      findFixed: jest.fn(async () => [buildMission()]),
      findRandom: jest.fn(async () => []),
    };
    userMissionRepository = {
      findCurrentMissions: jest.fn(async () => []),
      createForUser: jest.fn((_userKey, mission, periodStart) =>
        buildUserMission({ mission, createdAt: periodStart }),
      ),
      flush: jest.fn(async () => undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AssignMissionService,
          useFactory: (missionRepo, userMissionRepo) =>
            new AssignMissionService(missionRepo, userMissionRepo),
          inject: [MISSION_REPO_TOKEN, USER_MISSION_REPO_TOKEN],
        },
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
      expect(userMissionRepository.flush).toHaveBeenCalled();
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
      expect(userMissionRepository.flush).not.toHaveBeenCalled();
    });
  });

  describe("같은 슬롯의 미션 행이 데이터상 중복되면", () => {
    it("objectiveType 기준으로 하루 한 번만 배정하고 랜덤 풀 오염을 막는다", async () => {
      // 일일만 배정되도록 주간은 이미 존재 처리.
      userMissionRepository.findCurrentMissions.mockResolvedValue([
        buildUserMission({
          mission: buildMission({ period: MissionPeriod.WEEKLY }),
          createdAt: WEEK_START,
        }),
      ]);
      missionRepository.findFixed.mockImplementation(async (period) =>
        period === MissionPeriod.DAILY
          ? [
              buildMission({
                id: BigInt(1),
                title: "옛 감점",
                objectiveType: ObjectiveType.PENALTY,
              }),
              buildMission({
                id: BigInt(2),
                title: "새 감점",
                objectiveType: ObjectiveType.PENALTY,
              }),
              buildMission({
                id: BigInt(3),
                title: "초대",
                objectiveType: ObjectiveType.INVITE,
              }),
            ]
          : [],
      );
      missionRepository.findRandom.mockImplementation(async (period) =>
        period === MissionPeriod.DAILY
          ? [
              buildMission({
                id: BigInt(4),
                title: "옛 70점",
                objectiveType: ObjectiveType.SCORE,
              }),
              buildMission({
                id: BigInt(5),
                title: "새 70점",
                objectiveType: ObjectiveType.SCORE,
              }),
              buildMission({
                id: BigInt(6),
                title: "2회 그림",
                objectiveType: ObjectiveType.SUBMIT,
              }),
            ]
          : [],
      );

      await service.ensureMissionsAssigned(1, window);

      const objectives = userMissionRepository.createForUser.mock.calls.map(
        (call) => (call[1] as Mission).objectiveType,
      );
      // 중복 PENALTY/SCORE는 각각 1회만, 랜덤 풀이 {SCORE, SUBMIT}로 줄어 2회(SUBMIT)가 항상 포함.
      expect(
        objectives.filter((o) => o === ObjectiveType.PENALTY),
      ).toHaveLength(1);
      expect(objectives.filter((o) => o === ObjectiveType.SCORE)).toHaveLength(
        1,
      );
      expect(objectives).toContain(ObjectiveType.SUBMIT);
    });
  });

  describe("동시 요청으로 중복 키 에러가 발생하면", () => {
    it("ER_DUP_ENTRY는 무시한다", async () => {
      const dupError = Object.assign(new Error("Duplicate entry"), {
        code: "ER_DUP_ENTRY",
      });
      userMissionRepository.flush.mockRejectedValue(dupError);

      await expect(
        service.ensureMissionsAssigned(1, window),
      ).resolves.toBeUndefined();
    });
  });

  describe("중복 키가 아닌 에러가 발생하면", () => {
    it("에러를 다시 throw한다", async () => {
      userMissionRepository.flush.mockRejectedValue(
        new Error("Connection lost"),
      );

      await expect(service.ensureMissionsAssigned(1, window)).rejects.toThrow(
        "Connection lost",
      );
    });
  });
});
