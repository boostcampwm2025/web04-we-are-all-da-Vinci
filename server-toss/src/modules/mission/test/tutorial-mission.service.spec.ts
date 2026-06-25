import type { EntityManager } from "@mikro-orm/core";
import { ObjectiveType, MissionPeriod } from "../entity/mission.entity";
import type { Mission } from "../entity/mission.entity";
import type { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import type { CycleResult } from "../mission.types";
import type { MissionRepository } from "../repository/mission.repository";
import type { UserMissionRepository } from "../repository/user-mission.repository";
import { TutorialMissionService } from "../service/tutorial-mission.service";

const USER_KEY = 1234;
const COMPLETED_AT = new Date("2026-03-01T00:00:00.000Z");

const buildWindow = (
  now = new Date("2026-06-10T12:00:00.000Z"),
): MissionWindow =>
  new MissionWindow(
    new Date("2026-06-09T15:00:00.000Z"),
    new Date("2026-06-10T15:00:00.000Z"),
    new Date("2026-06-07T15:00:00.000Z"),
    new Date("2026-05-31T15:00:00.000Z"),
    now,
  );

const buildTutorialUserMission = (missionId: number): UserMission =>
  ({
    id: BigInt(missionId * 100),
    mission: { id: BigInt(missionId), period: MissionPeriod.TUTORIAL },
    completedAt: null,
  }) as unknown as UserMission;

describe("TutorialMissionService", () => {
  let service: TutorialMissionService;
  let missionRepository: Record<string, jest.Mock>;
  let userMissionRepository: Record<string, jest.Mock>;
  let em: Record<string, jest.Mock>;

  beforeEach(() => {
    missionRepository = {
      findTutorial: jest.fn(async () => [
        { id: BigInt(1) } as Mission,
        { id: BigInt(2) } as Mission,
      ]),
    };

    userMissionRepository = {
      findTutorialMissions: jest.fn(async () => []),
      findActiveTutorialDrawing: jest.fn(async () => []),
      findActiveTutorialByObjective: jest.fn(async () => []),
      findActiveTutorialMeta: jest.fn(async () => []),
      countIncompleteTutorial: jest.fn(async () => 0),
      createForUser: jest.fn(),
      flush: jest.fn(async () => undefined),
    };

    em = {
      findOne: jest.fn(async () => null),
    };

    service = new TutorialMissionService(
      missionRepository as unknown as MissionRepository,
      userMissionRepository as unknown as UserMissionRepository,
      em as unknown as EntityManager,
    );
  });

  describe("완료 게이트", () => {
    it("완료 유저(tutorialCompletedAt 있음)는 쿼리 없이 빈 배열을 반환한다", async () => {
      em.findOne.mockResolvedValue({ tutorialCompletedAt: COMPLETED_AT });

      const result = await service.findActiveMeta(USER_KEY);

      expect(result).toEqual([]);
      expect(
        userMissionRepository.findActiveTutorialMeta,
      ).not.toHaveBeenCalled();
    });

    it("게이트 통과 후 두 번째 호출부터는 User 조회도 생략한다 (메모리 캐시)", async () => {
      em.findOne.mockResolvedValue({ tutorialCompletedAt: COMPLETED_AT });

      await service.findActiveMeta(USER_KEY);
      em.findOne.mockClear();

      await service.findActiveMeta(USER_KEY);
      await service.findActiveDrawing(USER_KEY);

      expect(em.findOne).not.toHaveBeenCalled();
    });

    it("미완료 유저(tutorialCompletedAt null)는 repo로 위임한다", async () => {
      em.findOne.mockResolvedValue({ tutorialCompletedAt: null });
      const active = [buildTutorialUserMission(1)];
      userMissionRepository.findActiveTutorialMeta.mockResolvedValue(active);

      const result = await service.findActiveMeta(USER_KEY);

      expect(result).toBe(active);
    });

    it("User가 없으면 미완료로 보고 repo로 위임한다", async () => {
      em.findOne.mockResolvedValue(null);

      await service.findActiveByObjective(USER_KEY, ObjectiveType.SHARE);

      expect(
        userMissionRepository.findActiveTutorialByObjective,
      ).toHaveBeenCalledWith(USER_KEY, ObjectiveType.SHARE);
    });
  });

  describe("ensureTutorialAssigned", () => {
    it("보유 튜토리얼이 없으면 마스터 전체를 할당한다", async () => {
      userMissionRepository.findTutorialMissions.mockResolvedValue([]);

      await service.ensureTutorialAssigned(USER_KEY);

      expect(userMissionRepository.createForUser).toHaveBeenCalledTimes(2);
      expect(userMissionRepository.flush).toHaveBeenCalled();
    });

    it("이미 보유 중이면 다시 할당하지 않는다", async () => {
      userMissionRepository.findTutorialMissions.mockResolvedValue([
        buildTutorialUserMission(1),
      ]);

      await service.ensureTutorialAssigned(USER_KEY);

      expect(userMissionRepository.createForUser).not.toHaveBeenCalled();
    });
  });

  describe("recordCompletionIfFinished", () => {
    const tutorialCompletedResult: CycleResult = {
      completed: [],
      metaCompleted: [
        {
          mission: { period: MissionPeriod.TUTORIAL },
        } as unknown as UserMission,
      ],
    };

    it("사이클에 튜토리얼 완료가 없으면 아무것도 하지 않는다", async () => {
      const result: CycleResult = {
        completed: [
          {
            mission: { period: MissionPeriod.DAILY },
          } as unknown as UserMission,
        ],
        metaCompleted: [],
      };

      await service.recordCompletionIfFinished(USER_KEY, result, buildWindow());

      expect(
        userMissionRepository.countIncompleteTutorial,
      ).not.toHaveBeenCalled();
      expect(em.findOne).not.toHaveBeenCalled();
    });

    it("미완료 튜토리얼이 0이면 checkpoint를 세팅한다", async () => {
      const user = { tutorialCompletedAt: null as Date | null };
      em.findOne.mockResolvedValue(user);
      userMissionRepository.countIncompleteTutorial.mockResolvedValue(0);
      const window = buildWindow();

      await service.recordCompletionIfFinished(
        USER_KEY,
        tutorialCompletedResult,
        window,
      );

      expect(user.tutorialCompletedAt).toBe(window.now);
    });

    it("미완료 튜토리얼이 남아 있으면 checkpoint를 세팅하지 않는다", async () => {
      userMissionRepository.countIncompleteTutorial.mockResolvedValue(1);

      await service.recordCompletionIfFinished(
        USER_KEY,
        tutorialCompletedResult,
        buildWindow(),
      );

      expect(em.findOne).not.toHaveBeenCalled();
    });
  });
});
