import type { EntityManager } from "@mikro-orm/core";
import { ObjectiveType, QuestPeriod } from "../entity/quest.entity";
import type { Quest } from "../entity/quest.entity";
import type { UserQuest } from "../entity/user-quest.entity";
import { QuestWindow } from "../quest-window";
import type { CycleResult } from "../quest.types";
import type { QuestRepository } from "../repository/quest.repository";
import type { UserQuestRepository } from "../repository/user-quest.repository";
import { TutorialQuestService } from "../service/tutorial-quest.service";

const USER_KEY = 1234;
const COMPLETED_AT = new Date("2026-03-01T00:00:00.000Z");

const buildWindow = (now = new Date("2026-06-10T12:00:00.000Z")): QuestWindow =>
  new QuestWindow(
    new Date("2026-06-09T15:00:00.000Z"),
    new Date("2026-06-10T15:00:00.000Z"),
    new Date("2026-06-07T15:00:00.000Z"),
    new Date("2026-05-31T15:00:00.000Z"),
    now,
  );

const buildTutorialUserQuest = (questId: number): UserQuest =>
  ({
    id: BigInt(questId * 100),
    quest: { id: BigInt(questId), period: QuestPeriod.TUTORIAL },
    completedAt: null,
  }) as unknown as UserQuest;

describe("TutorialQuestService", () => {
  let service: TutorialQuestService;
  let questRepository: Record<string, jest.Mock>;
  let userQuestRepository: Record<string, jest.Mock>;
  let em: Record<string, jest.Mock>;

  beforeEach(() => {
    questRepository = {
      findTutorial: jest.fn(async () => [
        { id: BigInt(1) } as Quest,
        { id: BigInt(2) } as Quest,
      ]),
    };

    userQuestRepository = {
      findTutorialQuests: jest.fn(async () => []),
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

    service = new TutorialQuestService(
      questRepository as unknown as QuestRepository,
      userQuestRepository as unknown as UserQuestRepository,
      em as unknown as EntityManager,
    );
  });

  describe("완료 게이트", () => {
    it("완료 유저(tutorialCompletedAt 있음)는 쿼리 없이 빈 배열을 반환한다", async () => {
      em.findOne.mockResolvedValue({ tutorialCompletedAt: COMPLETED_AT });

      const result = await service.findActiveMeta(USER_KEY);

      expect(result).toEqual([]);
      expect(userQuestRepository.findActiveTutorialMeta).not.toHaveBeenCalled();
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
      const active = [buildTutorialUserQuest(1)];
      userQuestRepository.findActiveTutorialMeta.mockResolvedValue(active);

      const result = await service.findActiveMeta(USER_KEY);

      expect(result).toBe(active);
    });

    it("User가 없으면 미완료로 보고 repo로 위임한다", async () => {
      em.findOne.mockResolvedValue(null);

      await service.findActiveByObjective(USER_KEY, ObjectiveType.SHARE);

      expect(
        userQuestRepository.findActiveTutorialByObjective,
      ).toHaveBeenCalledWith(USER_KEY, ObjectiveType.SHARE);
    });
  });

  describe("ensureTutorialAssigned", () => {
    it("보유 튜토리얼이 없으면 마스터 전체를 할당한다", async () => {
      userQuestRepository.findTutorialQuests.mockResolvedValue([]);

      await service.ensureTutorialAssigned(USER_KEY);

      expect(userQuestRepository.createForUser).toHaveBeenCalledTimes(2);
      expect(userQuestRepository.flush).toHaveBeenCalled();
    });

    it("이미 보유 중이면 다시 할당하지 않는다", async () => {
      userQuestRepository.findTutorialQuests.mockResolvedValue([
        buildTutorialUserQuest(1),
      ]);

      await service.ensureTutorialAssigned(USER_KEY);

      expect(userQuestRepository.createForUser).not.toHaveBeenCalled();
    });
  });

  describe("recordCompletionIfFinished", () => {
    const tutorialCompletedResult: CycleResult = {
      completed: [],
      metaCompleted: [
        { quest: { period: QuestPeriod.TUTORIAL } } as unknown as UserQuest,
      ],
    };

    it("사이클에 튜토리얼 완료가 없으면 아무것도 하지 않는다", async () => {
      const result: CycleResult = {
        completed: [
          { quest: { period: QuestPeriod.DAILY } } as unknown as UserQuest,
        ],
        metaCompleted: [],
      };

      await service.recordCompletionIfFinished(USER_KEY, result, buildWindow());

      expect(
        userQuestRepository.countIncompleteTutorial,
      ).not.toHaveBeenCalled();
      expect(em.findOne).not.toHaveBeenCalled();
    });

    it("미완료 튜토리얼이 0이면 checkpoint를 세팅한다", async () => {
      const user = { tutorialCompletedAt: null as Date | null };
      em.findOne.mockResolvedValue(user);
      userQuestRepository.countIncompleteTutorial.mockResolvedValue(0);
      const window = buildWindow();

      await service.recordCompletionIfFinished(
        USER_KEY,
        tutorialCompletedResult,
        window,
      );

      expect(user.tutorialCompletedAt).toBe(window.now);
    });

    it("미완료 튜토리얼이 남아 있으면 checkpoint를 세팅하지 않는다", async () => {
      userQuestRepository.countIncompleteTutorial.mockResolvedValue(1);

      await service.recordCompletionIfFinished(
        USER_KEY,
        tutorialCompletedResult,
        buildWindow(),
      );

      expect(em.findOne).not.toHaveBeenCalled();
    });
  });
});
