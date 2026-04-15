jest.mock("@mikro-orm/nestjs", () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock("@mikro-orm/core", () => ({
  EntityManager: class {},
  EntityRepository: class {},
}));
jest.mock("@mikro-orm/decorators/legacy", () => ({
  Entity: () => (target: unknown) => target,
  PrimaryKey: () => () => undefined,
  Property: () => () => undefined,
  ManyToOne: () => () => undefined,
  ManyToMany: () => () => undefined,
  OneToMany: () => () => undefined,
}));

import { DailyPrompt } from "./daily-prompt.entity";
import { Prompt } from "./prompt.entity";
import { PromptSeedService, SEED_START_DATE } from "./prompt.seed";

type Persisted = Prompt | DailyPrompt;

const buildStroke = () => ({
  points: [
    [0, 1],
    [0, 1],
  ] as [number[], number[]],
  color: [0, 0, 0] as [number, number, number],
});

interface EmMock {
  persist: jest.Mock<EmMock, [Persisted]>;
  flush: jest.Mock<Promise<void>, []>;
  transactional: jest.Mock<
    Promise<void>,
    [(em: EmMock) => Promise<void> | void]
  >;
}

const createMocks = (promptCount: number, dailyCount: number) => {
  const persisted: Persisted[] = [];
  const em: EmMock = {
    persist: jest.fn((entity: Persisted) => {
      persisted.push(entity);
      return em;
    }),
    flush: jest.fn(async () => undefined),
    transactional: jest.fn(async (cb: (em: EmMock) => Promise<void> | void) => {
      await cb(em);
    }),
  };
  const promptRepo = { count: jest.fn(async () => promptCount) };
  const dailyRepo = { count: jest.fn(async () => dailyCount) };

  return { em, promptRepo, dailyRepo, persisted };
};

describe("PromptSeedService", () => {
  const sampleData = [
    [buildStroke()],
    [buildStroke(), buildStroke()],
    [buildStroke()],
  ];

  it("prompts와 daily_prompts가 비어있으면 JSON 순서대로 시드한다", async () => {
    const { em, promptRepo, dailyRepo, persisted } = createMocks(0, 0);
    const service = new PromptSeedService(
      em as never,
      promptRepo as never,
      dailyRepo as never,
    );

    const result = await service.runIfEmpty(sampleData);

    expect(result).toEqual({ seeded: 3, skipped: false });

    const prompts = persisted.filter((e): e is Prompt => e instanceof Prompt);
    const dailies = persisted.filter(
      (e): e is DailyPrompt => e instanceof DailyPrompt,
    );
    expect(prompts).toHaveLength(3);
    expect(dailies).toHaveLength(3);

    prompts.forEach((p, i) => {
      expect(JSON.parse(p.strokes)).toEqual(sampleData[i]);
    });

    const expectStartMs = SEED_START_DATE.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    dailies.forEach((d, i) => {
      expect(d.prompt).toBe(prompts[i]);
      expect(d.promptDate.getTime()).toBe(expectStartMs + i * oneDay);
    });
  });

  it("prompts가 이미 존재하면 시드하지 않는다", async () => {
    const { em, promptRepo, dailyRepo } = createMocks(5, 0);
    const service = new PromptSeedService(
      em as never,
      promptRepo as never,
      dailyRepo as never,
    );

    const result = await service.runIfEmpty(sampleData);

    expect(result).toEqual({ seeded: 0, skipped: true });
    expect(em.persist).not.toHaveBeenCalled();
    expect(em.transactional).not.toHaveBeenCalled();
  });

  it("daily_prompts만 존재해도 시드하지 않는다", async () => {
    const { em, promptRepo, dailyRepo } = createMocks(0, 1);
    const service = new PromptSeedService(
      em as never,
      promptRepo as never,
      dailyRepo as never,
    );

    const result = await service.runIfEmpty(sampleData);

    expect(result.skipped).toBe(true);
    expect(em.persist).not.toHaveBeenCalled();
  });
});
