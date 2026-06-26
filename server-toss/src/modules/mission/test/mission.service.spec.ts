jest.mock("src/common/util/time.util", () => ({
  getSeoulDayRange: () => ({
    start: new Date("2026-05-29T15:00:00.000Z"),
    end: new Date("2026-05-30T15:00:00.000Z"),
  }),
  getSeoulWeekStart: () => new Date("2026-05-25T15:00:00.000Z"),
  getSeoulMonthStart: () => new Date("2026-04-30T15:00:00.000Z"),
}));

import { Test } from "@nestjs/testing";
import { PointService } from "src/modules/point/point.service";
import {
  ObjectiveType,
  ProgressPeriod,
  Mission,
  MissionPeriod,
  RewardType,
} from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { AssignMissionService } from "../service/assign-mission.service";
import { MissionProcessor } from "../service/mission.processor";
import { MissionService } from "../service/mission.service";
import { TutorialMissionService } from "../service/tutorial-mission.service";

const USER_MISSION_REPO_TOKEN = "UserMissionRepository";

// todayStart(2026-05-29T15:00:00Z) 이후 시각 — 케이던스 게이트 차단 검증용
const ALREADY_PROGRESSED_TODAY = new Date("2026-05-29T16:00:00.000Z");

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
    user: { userKey: 1234 },
    mission: buildMission(),
    currentCount: 0,
    completedAt: null,
    lastProgressedAt: null,
    createdAt: new Date("2026-05-29T15:00:00.000Z"),
    ...overrides,
  }) as unknown as UserMission;

describe("MissionService", () => {
  let service: MissionService;
  let userMissionRepository: Record<string, jest.Mock>;
  let assignMissionService: { ensureMissionsAssigned: jest.Mock };
  let tutorialMissionService: Record<string, jest.Mock>;
  let pointService: Record<string, jest.Mock>;

  beforeEach(async () => {
    userMissionRepository = {
      findCurrentMissions: jest.fn(async () => []),
      findTodayDailyMissions: jest.fn(async () => []),
      findTutorialMissions: jest.fn(async () => []),
      findActiveByObjective: jest.fn(async () => []),
      findActiveDrawingMissions: jest.fn(async () => []),
      lockActiveForUpdate: jest.fn(async () => undefined),
      flush: jest.fn(async () => undefined),
    };

    assignMissionService = {
      ensureMissionsAssigned: jest.fn(async () => undefined),
    };

    tutorialMissionService = {
      findActiveDrawing: jest.fn(async () => []),
      findActiveByObjective: jest.fn(async () => []),
      findActiveMeta: jest.fn(async () => []),
      recordCompletionIfFinished: jest.fn(async () => undefined),
    };

    pointService = {
      savePointGrantRequest: jest.fn(async () => undefined),
      enqueueGrant: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: MissionService,
          useFactory: (
            userMissionRepo,
            processor,
            assignSvc,
            tutorialSvc,
            pointSvc,
          ) =>
            new MissionService(
              userMissionRepo,
              processor,
              assignSvc,
              tutorialSvc,
              pointSvc,
            ),
          inject: [
            USER_MISSION_REPO_TOKEN,
            MissionProcessor,
            AssignMissionService,
            TutorialMissionService,
            PointService,
          ],
        },
        { provide: USER_MISSION_REPO_TOKEN, useValue: userMissionRepository },
        { provide: AssignMissionService, useValue: assignMissionService },
        { provide: TutorialMissionService, useValue: tutorialMissionService },
        {
          provide: MissionProcessor,
          useFactory: (pointSvc: PointService) =>
            new MissionProcessor(pointSvc),
          inject: [PointService],
        },
        { provide: PointService, useValue: pointService },
      ],
    }).compile();

    service = module.get(MissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("myMissions", () => {
    describe("배정된 미션이 있으면", () => {
      it("기존 미션 목록을 DTO로 변환하여 반환한다", async () => {
        userMissionRepository.findCurrentMissions.mockResolvedValue([
          buildUserMission(),
        ]);

        const result = await service.myMissions(1234);

        expect(result.dailyMissions).toHaveLength(1);
        expect(result.dailyMissions[0].title).toBe("테스트 미션");
        expect(
          assignMissionService.ensureMissionsAssigned,
        ).not.toHaveBeenCalled();
      });
    });

    describe("배정된 미션이 없으면", () => {
      it("빈 목록을 반환한다", async () => {
        const result = await service.myMissions(1234);

        expect(result.dailyMissions).toHaveLength(0);
        expect(result.weeklyMissions).toHaveLength(0);
      });
    });
  });

  describe("todayDailyMissions", () => {
    it("오늘의 일일 미션을 경량 필드(이름·포인트·완료여부)로 반환한다", async () => {
      userMissionRepository.findTodayDailyMissions.mockResolvedValue([
        buildUserMission({
          mission: buildMission({ title: "감점 없이 제출", rewardAmount: 2 }),
          completedAt: new Date("2026-05-29T16:00:00.000Z"),
        }),
        buildUserMission({
          id: BigInt(2),
          mission: buildMission({
            id: BigInt(2),
            title: "70점 이상 받기",
            rewardAmount: 3,
          }),
          completedAt: null,
        }),
      ]);

      const result = await service.todayDailyMissions(1234);

      expect(result.missions).toEqual([
        { missionId: 1, title: "감점 없이 제출", rewardAmount: 2, done: true },
        { missionId: 2, title: "70점 이상 받기", rewardAmount: 3, done: false },
      ]);
    });

    it("배정된 미션이 없으면 빈 목록을 반환한다", async () => {
      const result = await service.todayDailyMissions(1234);

      expect(result.missions).toHaveLength(0);
      // 순수 조회 — 배정을 트리거하지 않는다
      expect(
        assignMissionService.ensureMissionsAssigned,
      ).not.toHaveBeenCalled();
    });
  });

  describe("assignAndGetMyMissions", () => {
    it("할당을 보장한 뒤 내 미션을 DTO로 반환한다", async () => {
      userMissionRepository.findCurrentMissions.mockResolvedValue([
        buildUserMission(),
      ]);

      const result = await service.assignAndGetMyMissions(1234);

      expect(assignMissionService.ensureMissionsAssigned).toHaveBeenCalledTimes(
        1,
      );
      expect(result.dailyMissions).toHaveLength(1);
    });
  });

  describe("onActionReported", () => {
    describe("활성 미션이 없으면", () => {
      it("빈 결과를 반환하고 flush한다", async () => {
        const result = await service.onActionReported(1234, {
          objectiveType: ObjectiveType.SUBMIT,
        });

        expect(result.completed).toEqual([]);
        expect(result.metaCompleted).toEqual([]);
        expect(userMissionRepository.flush).toHaveBeenCalled();
      });
    });

    // onActionReported는 튜토리얼 전용 — daily/weekly는 onDrawingSubmitted로만 진행
    describe("액션으로 튜토리얼 미션이 진행되면", () => {
      it("currentCount를 1 증가시키고 lastProgressedAt을 기록한다", async () => {
        const uq = buildUserMission({
          mission: buildMission({
            period: MissionPeriod.TUTORIAL,
            objectiveType: ObjectiveType.VISIT_RANKING,
            requiredCount: 5,
          }),
          currentCount: 0,
        });
        tutorialMissionService.findActiveByObjective.mockResolvedValue([uq]);

        await service.onActionReported(1234, {
          objectiveType: ObjectiveType.VISIT_RANKING,
        });

        expect(uq.currentCount).toBe(1);
        expect(uq.lastProgressedAt).toBeInstanceOf(Date);
      });
    });

    describe("미션이 완료되면", () => {
      it("completedAt을 설정하고 보상을 지급한다", async () => {
        const uq = buildUserMission({
          mission: buildMission({
            period: MissionPeriod.TUTORIAL,
            objectiveType: ObjectiveType.VISIT_RANKING,
            requiredCount: 1,
            rewardType: RewardType.POINT,
          }),
          currentCount: 0,
        });
        tutorialMissionService.findActiveByObjective.mockResolvedValue([uq]);

        const result = await service.onActionReported(1234, {
          objectiveType: ObjectiveType.VISIT_RANKING,
        });

        expect(uq.completedAt).not.toBeNull();
        // 미션의 rewardAmount(기본 10)가 그대로 지급 금액으로 전달된다
        expect(pointService.savePointGrantRequest).toHaveBeenCalledWith(
          1234,
          expect.anything(),
          10,
        );
        expect(result.completed).toContain(uq);
      });

      it("같은 카테고리 튜토리얼 메타 카운트를 완료 건수만큼 증가시킨다", async () => {
        const uq = buildUserMission({
          id: BigInt(10),
          mission: buildMission({
            period: MissionPeriod.TUTORIAL,
            objectiveType: ObjectiveType.VISIT_RANKING,
            category: "explore",
            requiredCount: 1,
          }),
          currentCount: 0,
        });
        const metaUq = buildUserMission({
          id: BigInt(20),
          mission: buildMission({
            id: BigInt(99),
            period: MissionPeriod.TUTORIAL,
            objectiveType: ObjectiveType.TUTORIAL_COMPLETED,
            category: "explore",
            requiredCount: 3,
          }),
          currentCount: 0,
        });

        tutorialMissionService.findActiveByObjective.mockResolvedValue([uq]);
        tutorialMissionService.findActiveMeta.mockResolvedValue([metaUq]);

        await service.onActionReported(1234, {
          objectiveType: ObjectiveType.VISIT_RANKING,
        });

        expect(metaUq.currentCount).toBe(1);
      });
    });
  });

  describe("onDrawingSubmitted — 진행 케이던스(ProgressLimit)", () => {
    const drawingContext = { drawingId: BigInt(1), score: 90, penalty: 0 };

    it("progressPeriod=day 미션이 오늘 처음이면 진행한다", async () => {
      const fresh = buildUserMission({
        mission: buildMission({
          objectiveType: ObjectiveType.DAILY_SUBMIT,
          progressPeriod: ProgressPeriod.DAY,
          requiredCount: 3,
        }),
        currentCount: 0,
        lastProgressedAt: null,
      });
      userMissionRepository.findActiveDrawingMissions.mockResolvedValue([
        fresh,
      ]);

      await service.onDrawingSubmitted(1234, drawingContext);

      expect(fresh.currentCount).toBe(1);
      expect(fresh.lastProgressedAt).toBeInstanceOf(Date);
    });

    it("progressPeriod=day 미션은 오늘 이미 진행했으면 다시 진행하지 않는다", async () => {
      const already = buildUserMission({
        mission: buildMission({
          objectiveType: ObjectiveType.DAILY_SUBMIT,
          progressPeriod: ProgressPeriod.DAY,
          requiredCount: 3,
        }),
        currentCount: 1,
        lastProgressedAt: ALREADY_PROGRESSED_TODAY,
      });
      userMissionRepository.findActiveDrawingMissions.mockResolvedValue([
        already,
      ]);

      await service.onDrawingSubmitted(1234, drawingContext);

      expect(already.currentCount).toBe(1);
    });

    it("튜토리얼 활성 미션도 게이트드 서비스에서 받아 함께 진행한다", async () => {
      const tutorialUq = buildUserMission({
        mission: buildMission({
          period: MissionPeriod.TUTORIAL,
          objectiveType: ObjectiveType.SUBMIT,
          requiredCount: 1,
        }),
        currentCount: 0,
      });
      tutorialMissionService.findActiveDrawing.mockResolvedValue([tutorialUq]);

      const result = await service.onDrawingSubmitted(1234, drawingContext);

      expect(result.completed).toContain(tutorialUq);
      expect(
        tutorialMissionService.recordCompletionIfFinished,
      ).toHaveBeenCalled();
    });

    it("progressPeriod=none 미션은 오늘 이미 진행했어도 매 제출마다 진행한다", async () => {
      const uq = buildUserMission({
        mission: buildMission({
          objectiveType: ObjectiveType.SCORE,
          threshold: 70,
          requiredCount: 5,
          progressPeriod: ProgressPeriod.NONE,
        }),
        currentCount: 1,
        lastProgressedAt: ALREADY_PROGRESSED_TODAY,
      });
      userMissionRepository.findActiveDrawingMissions.mockResolvedValue([uq]);

      await service.onDrawingSubmitted(1234, drawingContext);

      expect(uq.currentCount).toBe(2);
    });

    it("INVITE 미션이 활성 목록에 섞여 들어와도 그림 제출로는 진행되지 않아요", async () => {
      // INVITE는 공유(syncInviteProgress) 전용 — 프로세서 commandMap에서 제외돼
      // 그림 제출 경로로는 절대 증가하지 않아야 한다(공유 0회인데 1로 오르던 버그 방지).
      const invite = buildUserMission({
        mission: buildMission({
          objectiveType: ObjectiveType.INVITE,
          requiredCount: 5,
          progressPeriod: ProgressPeriod.NONE,
        }),
        currentCount: 0,
      });
      userMissionRepository.findActiveDrawingMissions.mockResolvedValue([
        invite,
      ]);

      await service.onDrawingSubmitted(1234, drawingContext);

      expect(invite.currentCount).toBe(0);
      expect(invite.completedAt).toBeNull();
    });
  });

  describe("친구초대 미션 동기화는 ShareLog 실개수를 단일 소스로 멱등하게 반영해요", () => {
    const buildInviteMission = (currentCount: number): UserMission =>
      buildUserMission({
        mission: buildMission({
          objectiveType: ObjectiveType.INVITE,
          period: MissionPeriod.DAILY,
          requiredCount: 5,
          rewardType: RewardType.POINT,
          rewardAmount: 5,
          progressPeriod: ProgressPeriod.NONE,
        }),
        currentCount,
      });

    // 호출자(트랜잭션) em을 모사 — findOne은 활성 INVITE 미션, find는 주간 메타를 돌려준다.
    const buildEm = (
      invite: UserMission | null,
      metas: UserMission[] = [],
    ) => ({
      findOne: jest.fn(async () => invite),
      find: jest.fn(async () => metas),
    });

    it("당일 누적 초대 횟수를 그대로 진행도로 설정해요", async () => {
      const uq = buildInviteMission(0);
      const em = buildEm(uq);

      await service.syncInviteProgress(em as never, 1234, 1);

      expect(uq.currentCount).toBe(1);
      expect(uq.completedAt).toBeNull();
      expect(pointService.enqueueGrant).not.toHaveBeenCalled();
    });

    it("이전 진행이 누락돼도 다음 호출이 실제 초대 횟수로 보정해요", async () => {
      const uq = buildInviteMission(2);
      const em = buildEm(uq);

      await service.syncInviteProgress(em as never, 1234, 4);

      expect(uq.currentCount).toBe(4);
      expect(uq.completedAt).toBeNull();
    });

    it("진행도를 전달된 초대 수 실값으로 설정해요", async () => {
      // chargeByShare가 유일 작성자이고 같은 트랜잭션에서 단조 증가 실값을 넘기므로,
      // 별도 보정 없이 inviteCount를 그대로 반영한다.
      const uq = buildInviteMission(0);
      const em = buildEm(uq);

      await service.syncInviteProgress(em as never, 1234, 3);

      expect(uq.currentCount).toBe(3);
      expect(uq.completedAt).toBeNull();
    });

    it("다섯 번째 초대로 채워지면 완료 처리하고 5원을 한 번만 같은 트랜잭션에 적재해요", async () => {
      const uq = buildInviteMission(4);
      const em = buildEm(uq);

      await service.syncInviteProgress(em as never, 1234, 5);

      expect(uq.currentCount).toBe(5);
      expect(uq.completedAt).not.toBeNull();
      expect(pointService.enqueueGrant).toHaveBeenCalledTimes(1);
      expect(pointService.enqueueGrant).toHaveBeenCalledWith(
        em,
        1234,
        expect.anything(),
        5,
      );
    });

    it("미션 완료 시 주간 메타(일일 미션 완료 수)도 1 증가시켜요", async () => {
      const uq = buildInviteMission(4);
      const meta = buildUserMission({
        mission: buildMission({
          objectiveType: ObjectiveType.MISSION_COMPLETED,
          period: MissionPeriod.WEEKLY,
          requiredCount: 7,
        }),
        currentCount: 3,
      });
      const em = buildEm(uq, [meta]);

      await service.syncInviteProgress(em as never, 1234, 5);

      expect(meta.currentCount).toBe(4);
    });

    it("미배정/완료 상태(em.findOne null)면 아무 지급도 하지 않아요", async () => {
      const em = buildEm(null);

      await service.syncInviteProgress(em as never, 1234, 5);

      expect(pointService.enqueueGrant).not.toHaveBeenCalled();
    });
  });
});
