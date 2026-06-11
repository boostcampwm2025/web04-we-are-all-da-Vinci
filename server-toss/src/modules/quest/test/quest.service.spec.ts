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
  Quest,
  QuestPeriod,
  RewardType,
} from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";
import { AssignQuestService } from "../service/assign-quest.service";
import { QuestProcessor } from "../service/quest.processor";
import { QuestService } from "../service/quest.service";
import { TutorialQuestService } from "../service/tutorial-quest.service";

const USER_QUEST_REPO_TOKEN = "UserQuestRepository";

// todayStart(2026-05-29T15:00:00Z) 이후 시각 — 케이던스 게이트 차단 검증용
const ALREADY_PROGRESSED_TODAY = new Date("2026-05-29T16:00:00.000Z");

const buildQuest = (overrides: Partial<Quest> = {}): Quest =>
  ({
    id: BigInt(1),
    title: "테스트 퀘스트",
    period: QuestPeriod.DAILY,
    isFixed: true,
    objectiveType: ObjectiveType.SUBMIT,
    requiredCount: 3,
    threshold: null,
    rewardType: RewardType.POINT,
    rewardAmount: 10,
    progressPeriod: ProgressPeriod.NONE,
    ...overrides,
  }) as Quest;

const buildUserQuest = (overrides: Partial<UserQuest> = {}): UserQuest =>
  ({
    id: BigInt(1),
    user: { userKey: 1234 },
    quest: buildQuest(),
    currentCount: 0,
    completedAt: null,
    lastProgressedAt: null,
    createdAt: new Date("2026-05-29T15:00:00.000Z"),
    ...overrides,
  }) as unknown as UserQuest;

describe("QuestService", () => {
  let service: QuestService;
  let userQuestRepository: Record<string, jest.Mock>;
  let assignQuestService: { ensureQuestsAssigned: jest.Mock };
  let tutorialQuestService: Record<string, jest.Mock>;
  let pointService: Record<string, jest.Mock>;

  beforeEach(async () => {
    userQuestRepository = {
      findCurrentQuests: jest.fn(async () => []),
      findTutorialQuests: jest.fn(async () => []),
      findActiveByObjective: jest.fn(async () => []),
      findActiveDrawingQuests: jest.fn(async () => []),
      flush: jest.fn(async () => undefined),
    };

    assignQuestService = {
      ensureQuestsAssigned: jest.fn(async () => undefined),
    };

    tutorialQuestService = {
      findActiveDrawing: jest.fn(async () => []),
      findActiveByObjective: jest.fn(async () => []),
      findActiveMeta: jest.fn(async () => []),
      recordCompletionIfFinished: jest.fn(async () => undefined),
    };

    pointService = {
      savePointGrantRequest: jest.fn(async () => undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: QuestService,
          useFactory: (userQuestRepo, processor, assignSvc, tutorialSvc) =>
            new QuestService(userQuestRepo, processor, assignSvc, tutorialSvc),
          inject: [
            USER_QUEST_REPO_TOKEN,
            QuestProcessor,
            AssignQuestService,
            TutorialQuestService,
          ],
        },
        { provide: USER_QUEST_REPO_TOKEN, useValue: userQuestRepository },
        { provide: AssignQuestService, useValue: assignQuestService },
        { provide: TutorialQuestService, useValue: tutorialQuestService },
        {
          provide: QuestProcessor,
          useFactory: (pointSvc: PointService) => new QuestProcessor(pointSvc),
          inject: [PointService],
        },
        { provide: PointService, useValue: pointService },
      ],
    }).compile();

    service = module.get(QuestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("myQuests", () => {
    describe("배정된 퀘스트가 있으면", () => {
      it("기존 퀘스트 목록을 DTO로 변환하여 반환한다", async () => {
        userQuestRepository.findCurrentQuests.mockResolvedValue([
          buildUserQuest(),
        ]);

        const result = await service.myQuests(1234);

        expect(result.dailyQuests).toHaveLength(1);
        expect(result.dailyQuests[0].title).toBe("테스트 퀘스트");
        expect(assignQuestService.ensureQuestsAssigned).not.toHaveBeenCalled();
      });
    });

    describe("배정된 퀘스트가 없으면", () => {
      it("빈 목록을 반환한다", async () => {
        const result = await service.myQuests(1234);

        expect(result.dailyQuests).toHaveLength(0);
        expect(result.weeklyQuests).toHaveLength(0);
      });
    });
  });

  describe("assignAndGetMyQuests", () => {
    it("할당을 보장한 뒤 내 퀘스트를 DTO로 반환한다", async () => {
      userQuestRepository.findCurrentQuests.mockResolvedValue([
        buildUserQuest(),
      ]);

      const result = await service.assignAndGetMyQuests(1234);

      expect(assignQuestService.ensureQuestsAssigned).toHaveBeenCalledTimes(1);
      expect(result.dailyQuests).toHaveLength(1);
    });
  });

  describe("onActionReported", () => {
    describe("활성 퀘스트가 없으면", () => {
      it("빈 결과를 반환하고 flush한다", async () => {
        const result = await service.onActionReported(1234, {
          objectiveType: ObjectiveType.SUBMIT,
        });

        expect(result.completed).toEqual([]);
        expect(result.metaCompleted).toEqual([]);
        expect(userQuestRepository.flush).toHaveBeenCalled();
      });
    });

    describe("SUBMIT 액션으로 퀘스트가 진행되면", () => {
      it("currentCount를 1 증가시키고 lastProgressedAt을 기록한다", async () => {
        const uq = buildUserQuest({
          quest: buildQuest({
            objectiveType: ObjectiveType.SUBMIT,
            requiredCount: 5,
          }),
          currentCount: 0,
        });
        userQuestRepository.findActiveByObjective.mockResolvedValueOnce([uq]);

        await service.onActionReported(1234, {
          objectiveType: ObjectiveType.SUBMIT,
        });

        expect(uq.currentCount).toBe(1);
        expect(uq.lastProgressedAt).toBeInstanceOf(Date);
      });
    });

    describe("퀘스트가 완료되면", () => {
      it("completedAt을 설정하고 보상을 지급한다", async () => {
        const uq = buildUserQuest({
          quest: buildQuest({
            objectiveType: ObjectiveType.SUBMIT,
            requiredCount: 1,
            rewardType: RewardType.POINT,
          }),
          currentCount: 0,
        });
        userQuestRepository.findActiveByObjective.mockResolvedValueOnce([uq]);

        const result = await service.onActionReported(1234, {
          objectiveType: ObjectiveType.SUBMIT,
        });

        expect(uq.completedAt).not.toBeNull();
        expect(pointService.savePointGrantRequest).toHaveBeenCalledWith(
          1234,
          expect.anything(),
        );
        expect(result.completed).toContain(uq);
      });

      it("메타퀘스트의 카운트를 완료 건수만큼 증가시킨다", async () => {
        const uq = buildUserQuest({
          id: BigInt(10),
          quest: buildQuest({
            objectiveType: ObjectiveType.SUBMIT,
            requiredCount: 1,
          }),
          currentCount: 0,
        });
        const metaUq = buildUserQuest({
          id: BigInt(20),
          quest: buildQuest({
            id: BigInt(99),
            objectiveType: ObjectiveType.QUEST_COMPLETED,
            requiredCount: 5,
          }),
          currentCount: 0,
        });

        userQuestRepository.findActiveByObjective
          .mockResolvedValueOnce([uq])
          .mockResolvedValueOnce([metaUq]);

        await service.onActionReported(1234, {
          objectiveType: ObjectiveType.SUBMIT,
        });

        expect(metaUq.currentCount).toBe(1);
      });
    });
  });

  describe("onDrawingSubmitted — 진행 케이던스(ProgressLimit)", () => {
    const drawingContext = { drawingId: BigInt(1), score: 90, penalty: 0 };

    it("progressPeriod=day 퀘스트가 오늘 처음이면 진행한다", async () => {
      const fresh = buildUserQuest({
        quest: buildQuest({
          objectiveType: ObjectiveType.DAILY_SUBMIT,
          progressPeriod: ProgressPeriod.DAY,
          requiredCount: 3,
        }),
        currentCount: 0,
        lastProgressedAt: null,
      });
      userQuestRepository.findActiveDrawingQuests.mockResolvedValue([fresh]);

      await service.onDrawingSubmitted(1234, drawingContext);

      expect(fresh.currentCount).toBe(1);
      expect(fresh.lastProgressedAt).toBeInstanceOf(Date);
    });

    it("progressPeriod=day 퀘스트는 오늘 이미 진행했으면 다시 진행하지 않는다", async () => {
      const already = buildUserQuest({
        quest: buildQuest({
          objectiveType: ObjectiveType.DAILY_SUBMIT,
          progressPeriod: ProgressPeriod.DAY,
          requiredCount: 3,
        }),
        currentCount: 1,
        lastProgressedAt: ALREADY_PROGRESSED_TODAY,
      });
      userQuestRepository.findActiveDrawingQuests.mockResolvedValue([already]);

      await service.onDrawingSubmitted(1234, drawingContext);

      expect(already.currentCount).toBe(1);
    });

    it("튜토리얼 활성 퀘스트도 게이트드 서비스에서 받아 함께 진행한다", async () => {
      const tutorialUq = buildUserQuest({
        quest: buildQuest({
          period: QuestPeriod.TUTORIAL,
          objectiveType: ObjectiveType.SUBMIT,
          requiredCount: 1,
        }),
        currentCount: 0,
      });
      tutorialQuestService.findActiveDrawing.mockResolvedValue([tutorialUq]);

      const result = await service.onDrawingSubmitted(1234, drawingContext);

      expect(result.completed).toContain(tutorialUq);
      expect(
        tutorialQuestService.recordCompletionIfFinished,
      ).toHaveBeenCalled();
    });

    it("progressPeriod=none 퀘스트는 오늘 이미 진행했어도 매 제출마다 진행한다", async () => {
      const uq = buildUserQuest({
        quest: buildQuest({
          objectiveType: ObjectiveType.SCORE,
          threshold: 70,
          requiredCount: 5,
          progressPeriod: ProgressPeriod.NONE,
        }),
        currentCount: 1,
        lastProgressedAt: ALREADY_PROGRESSED_TODAY,
      });
      userQuestRepository.findActiveDrawingQuests.mockResolvedValue([uq]);

      await service.onDrawingSubmitted(1234, drawingContext);

      expect(uq.currentCount).toBe(2);
    });
  });
});
