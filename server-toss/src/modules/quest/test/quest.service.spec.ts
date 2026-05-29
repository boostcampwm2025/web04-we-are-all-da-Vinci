jest.mock("src/common/util/time.util", () => ({
  getSeoulDayRange: () => ({
    start: new Date("2026-05-29T15:00:00.000Z"),
    end: new Date("2026-05-30T15:00:00.000Z"),
  }),
  getSeoulWeekStart: () => new Date("2026-05-25T15:00:00.000Z"),
}));

import { Test } from "@nestjs/testing";
import { QuestService } from "../quest.service";
import { PointService } from "src/modules/point/point.service";
import {
  ObjectiveType,
  Quest,
  QuestPeriod,
  RewardType,
} from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";

const QUEST_REPO_TOKEN = "QuestRepository";
const USER_QUEST_REPO_TOKEN = "UserQuestRepository";

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
    ...overrides,
  }) as Quest;

const buildUserQuest = (overrides: Partial<UserQuest> = {}): UserQuest =>
  ({
    id: BigInt(1),
    user: { userKey: 1234 },
    quest: buildQuest(),
    currentCount: 0,
    completedAt: null,
    createdAt: new Date("2026-05-29T15:00:00.000Z"),
    ...overrides,
  }) as unknown as UserQuest;

describe("QuestService", () => {
  let service: QuestService;
  let questRepository: Record<string, jest.Mock>;
  let userQuestRepository: Record<string, jest.Mock>;
  let pointService: Record<string, jest.Mock>;

  beforeEach(async () => {
    questRepository = {
      findFixed: jest.fn(async () => []),
      findRandom: jest.fn(async () => []),
    };

    userQuestRepository = {
      findCurrentQuests: jest.fn(async () => []),
      findActiveByObjective: jest.fn(async () => []),
      createForUser: jest.fn((_userKey, quest, periodStart) => {
        return buildUserQuest({ quest, createdAt: periodStart });
      }),
      flush: jest.fn(async () => undefined),
    };

    pointService = {
      grantDrawingPromotionIfEligible: jest.fn(async () => true),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: QuestService,
          useFactory: (questRepo, userQuestRepo, pointSvc) =>
            new QuestService(questRepo, userQuestRepo, pointSvc),
          inject: [QUEST_REPO_TOKEN, USER_QUEST_REPO_TOKEN, PointService],
        },
        { provide: QUEST_REPO_TOKEN, useValue: questRepository },
        { provide: USER_QUEST_REPO_TOKEN, useValue: userQuestRepository },
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
      it("기존 퀘스트 목록을 반환한다", async () => {
        const existing = [buildUserQuest()];
        userQuestRepository.findCurrentQuests.mockResolvedValue(existing);

        const result = await service.myQuests(1234);

        expect(result).toBe(existing);
        expect(userQuestRepository.flush).not.toHaveBeenCalled();
      });
    });

    describe("배정된 퀘스트가 없으면", () => {
      it("새로운 퀘스트를 배정한다", async () => {
        const fixedQuest = buildQuest({ isFixed: true });
        questRepository.findFixed.mockResolvedValue([fixedQuest]);
        questRepository.findRandom.mockResolvedValue([]);

        const result = await service.myQuests(1234);

        expect(userQuestRepository.createForUser).toHaveBeenCalled();
        expect(userQuestRepository.flush).toHaveBeenCalled();
        expect(result.length).toBeGreaterThan(0);
      });

      it("고정 퀘스트와 랜덤 퀘스트를 합산하여 배정한다", async () => {
        const fixed = buildQuest({ id: BigInt(1), isFixed: true });
        const random1 = buildQuest({ id: BigInt(2), isFixed: false });
        const random2 = buildQuest({ id: BigInt(3), isFixed: false });
        const random3 = buildQuest({ id: BigInt(4), isFixed: false });

        questRepository.findFixed.mockResolvedValue([fixed]);
        questRepository.findRandom.mockResolvedValue([
          random1,
          random2,
          random3,
        ]);

        await service.myQuests(1234);

        const dailyCalls = userQuestRepository.createForUser.mock.calls.filter(
          (call: unknown[]) =>
            (call[2] as Date).getTime() ===
            new Date("2026-05-29T15:00:00.000Z").getTime(),
        );
        expect(dailyCalls.length).toBe(3);
      });
    });
  });

  describe("recordAction", () => {
    describe("활성 퀘스트가 없으면", () => {
      it("빈 배열을 반환한다", async () => {
        userQuestRepository.findActiveByObjective.mockResolvedValue([]);

        const result = await service.recordAction(
          1234,
          ObjectiveType.SUBMIT,
          {},
        );

        expect(result).toEqual([]);
        expect(userQuestRepository.flush).toHaveBeenCalled();
      });
    });

    describe("SUBMIT 액션으로 퀘스트가 진행되면", () => {
      it("currentCount를 1 증가시킨다", async () => {
        const uq = buildUserQuest({
          quest: buildQuest({
            objectiveType: ObjectiveType.SUBMIT,
            requiredCount: 5,
          }),
          currentCount: 0,
        });
        userQuestRepository.findActiveByObjective.mockResolvedValue([uq]);

        await service.recordAction(1234, ObjectiveType.SUBMIT, {});

        expect(uq.currentCount).toBe(1);
      });
    });

    describe("SCORE 액션", () => {
      it("점수가 threshold 미만이면 퀘스트를 진행하지 않는다", async () => {
        const uq = buildUserQuest({
          quest: buildQuest({
            objectiveType: ObjectiveType.SCORE,
            requiredCount: 3,
            threshold: 80,
          }),
          currentCount: 0,
        });
        userQuestRepository.findActiveByObjective.mockResolvedValue([uq]);

        await service.recordAction(1234, ObjectiveType.SCORE, { score: 50 });

        expect(uq.currentCount).toBe(0);
      });

      it("점수가 threshold 이상이면 currentCount를 1 증가시킨다", async () => {
        const uq = buildUserQuest({
          quest: buildQuest({
            objectiveType: ObjectiveType.SCORE,
            requiredCount: 3,
            threshold: 80,
          }),
          currentCount: 0,
        });
        userQuestRepository.findActiveByObjective.mockResolvedValue([uq]);

        await service.recordAction(1234, ObjectiveType.SCORE, { score: 90 });

        expect(uq.currentCount).toBe(1);
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
        userQuestRepository.findActiveByObjective.mockResolvedValue([uq]);

        const result = await service.recordAction(
          1234,
          ObjectiveType.SUBMIT,
          {},
        );

        expect(uq.completedAt).not.toBeNull();
        expect(
          pointService.grantDrawingPromotionIfEligible,
        ).toHaveBeenCalledWith(1234);
        expect(result).toContain(uq);
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

        await service.recordAction(1234, ObjectiveType.SUBMIT, {});

        expect(metaUq.currentCount).toBe(1);
      });
    });

    describe("메타퀘스트도 완료되면", () => {
      it("완료 배열에 메타퀘스트도 포함한다", async () => {
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
            requiredCount: 1,
          }),
          currentCount: 0,
        });

        userQuestRepository.findActiveByObjective
          .mockResolvedValueOnce([uq])
          .mockResolvedValueOnce([metaUq]);

        const result = await service.recordAction(
          1234,
          ObjectiveType.SUBMIT,
          {},
        );

        expect(result).toContain(uq);
        expect(result).toContain(metaUq);
        expect(metaUq.completedAt).not.toBeNull();
      });
    });

    describe("두 개의 퀘스트가 동시에 완료되면", () => {
      it("메타퀘스트 카운트가 2 증가한다", async () => {
        const uq1 = buildUserQuest({
          id: BigInt(10),
          quest: buildQuest({
            id: BigInt(1),
            objectiveType: ObjectiveType.SUBMIT,
            requiredCount: 1,
          }),
          currentCount: 0,
        });
        const uq2 = buildUserQuest({
          id: BigInt(11),
          quest: buildQuest({
            id: BigInt(2),
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
          .mockResolvedValueOnce([uq1, uq2])
          .mockResolvedValueOnce([metaUq]);

        await service.recordAction(1234, ObjectiveType.SUBMIT, {});

        expect(metaUq.currentCount).toBe(2);
      });
    });
  });
});
