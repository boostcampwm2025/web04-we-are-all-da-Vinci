import {
  ObjectiveType,
  Quest,
  QuestPeriod,
  RewardType,
} from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";
import { QuestSeedService, type QuestDefinition } from "../quest.seed";

const buildQuest = (overrides: Partial<Quest> = {}): Quest =>
  ({
    id: BigInt(1),
    title: "테스트 퀘스트",
    period: QuestPeriod.DAILY,
    isFixed: true,
    objectiveType: ObjectiveType.SUBMIT,
    requiredCount: 1,
    threshold: undefined,
    rewardType: RewardType.POINT,
    rewardAmount: 10,
    ...overrides,
  }) as Quest;

const buildDef = (
  overrides: Partial<QuestDefinition> = {},
): QuestDefinition => ({
  title: "테스트 퀘스트",
  period: QuestPeriod.DAILY,
  isFixed: true,
  objectiveType: ObjectiveType.SUBMIT,
  requiredCount: 1,
  threshold: null,
  rewardType: RewardType.POINT,
  rewardAmount: 10,
  ...overrides,
});

const setup = (
  existingQuests: Quest[] = [],
  userQuestCounts: Map<bigint, number> = new Map(),
) => {
  const persisted: unknown[] = [];
  const removed: unknown[] = [];

  const questRepo = {
    findAll: jest.fn(async () => existingQuests),
  };
  const userQuestRepo = {
    count: jest.fn(
      async ({ quest }: { quest: Quest }) => userQuestCounts.get(quest.id) ?? 0,
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
      if (cls === Quest) return questRepo;
      if (cls === UserQuest) return userQuestRepo;
    }),
  };

  const em = {
    fork: jest.fn(() => ({
      transactional: jest.fn(async (cb: (em: typeof txEm) => Promise<void>) =>
        cb(txEm),
      ),
    })),
  };

  const service = new QuestSeedService(em as never);
  return { service, persisted, removed, txEm, questRepo, userQuestRepo };
};

describe("QuestSeedService", () => {
  describe("syncQuests", () => {
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

      const result = await service.syncQuests(data);

      expect(result.added).toBe(2);
      expect(result.deleted).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.protected).toBe(0);
      expect(persisted).toHaveLength(2);
    });

    it("user_quest 없는 기존 퀘스트는 삭제한다", async () => {
      const orphan = buildQuest({ id: BigInt(99), title: "삭제될 퀘스트" });
      const { service, removed } = setup([orphan]);

      const result = await service.syncQuests([
        buildDef({ title: "새 퀘스트" }),
      ]);

      expect(result.deleted).toBe(1);
      expect(removed).toContain(orphan);
      expect(result.added).toBe(1);
    });

    it("user_quest 있는 기존 퀘스트는 보존한다", async () => {
      const protectedQuest = buildQuest({
        id: BigInt(10),
        title: "보존될 퀘스트",
      });
      const counts = new Map([[BigInt(10), 3]]);
      const { service, removed } = setup([protectedQuest], counts);

      const result = await service.syncQuests([
        buildDef({ title: "새 퀘스트" }),
      ]);

      expect(result.protected).toBe(1);
      expect(result.deleted).toBe(0);
      expect(removed).not.toContain(protectedQuest);
    });

    it("JSON에 있는 기존 퀘스트의 필드를 업데이트한다", async () => {
      const existing = buildQuest({
        id: BigInt(1),
        title: "그림 제출하기",
        rewardAmount: 10,
      });
      const { service } = setup([existing]);

      const result = await service.syncQuests([
        buildDef({ title: "그림 제출하기", rewardAmount: 20 }),
      ]);

      expect(result.updated).toBe(1);
      expect(result.added).toBe(0);
      expect(existing.rewardAmount).toBe(20);
    });

    it("동일한 데이터면 변경하지 않는다", async () => {
      const existing = buildQuest({ id: BigInt(1), title: "그림 제출하기" });
      const { service } = setup([existing]);

      const result = await service.syncQuests([
        buildDef({ title: "그림 제출하기" }),
      ]);

      expect(result.updated).toBe(0);
      expect(result.added).toBe(0);
      expect(result.deleted).toBe(0);
    });
  });
});
