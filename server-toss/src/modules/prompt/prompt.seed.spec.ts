import { DailyPrompt } from "./daily-prompt.entity";
import { Prompt } from "./prompt.entity";
import type { DatedPrompt } from "./prompt.seed";
import { PromptSeedService } from "./prompt.seed";

type Persisted = Prompt | DailyPrompt;

const buildStroke = () => ({
  points: [
    [0, 1],
    [0, 1],
  ] as [number[], number[]],
  color: [0, 0, 0] as [number, number, number],
});

interface ForkedEm {
  persist: jest.Mock<ForkedEm, [Persisted]>;
  flush: jest.Mock<Promise<void>, []>;
  transactional: jest.Mock<
    Promise<void>,
    [(em: ForkedEm) => Promise<void> | void]
  >;
  getRepository: jest.Mock<
    { count: jest.Mock<Promise<number>, []> },
    [unknown]
  >;
}

const createMocks = (promptCount: number, dailyCount: number) => {
  const persisted: Persisted[] = [];
  const promptRepo = { count: jest.fn(async () => promptCount) };
  const dailyRepo = { count: jest.fn(async () => dailyCount) };
  const forked: ForkedEm = {
    persist: jest.fn((entity: Persisted) => {
      persisted.push(entity);
      return forked;
    }),
    flush: jest.fn(async () => undefined),
    transactional: jest.fn(
      async (cb: (em: ForkedEm) => Promise<void> | void) => {
        await cb(forked);
      },
    ),
    getRepository: jest.fn((entity: unknown) =>
      entity === Prompt ? promptRepo : dailyRepo,
    ),
  };
  const em = { fork: jest.fn(() => forked) };

  return { em, forked, promptRepo, dailyRepo, persisted };
};

describe("PromptSeedService", () => {
  const sampleData: DatedPrompt[] = [
    { date: "2026-04-01", strokes: [buildStroke()] },
    { date: "2026-04-02", strokes: [buildStroke(), buildStroke()] },
    { date: "2026-04-05", strokes: [buildStroke()] },
  ];

  it("prompts와 daily_prompts가 비어있으면 JSON의 date대로 시드한다", async () => {
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
      expect(JSON.parse(p.strokes)).toEqual(sampleData[i].strokes);
    });

    dailies.forEach((d, i) => {
      expect(d.prompt).toBe(prompts[i]);
      expect(d.promptDate.toISOString()).toBe(
        sampleData[i].date + "T00:00:00.000Z",
      );
    });
  });

  it("prompts가 이미 존재하면 시드하지 않는다", async () => {
    const { em, forked, promptRepo, dailyRepo } = createMocks(5, 0);
    const service = new PromptSeedService(
      em as never,
      promptRepo as never,
      dailyRepo as never,
    );

    const result = await service.runIfEmpty(sampleData);

    expect(result).toEqual({ seeded: 0, skipped: true });
    expect(forked.persist).not.toHaveBeenCalled();
    expect(forked.transactional).not.toHaveBeenCalled();
  });

  it("daily_prompts만 존재해도 시드하지 않는다", async () => {
    const { em, forked, promptRepo, dailyRepo } = createMocks(0, 1);
    const service = new PromptSeedService(
      em as never,
      promptRepo as never,
      dailyRepo as never,
    );

    const result = await service.runIfEmpty(sampleData);

    expect(result.skipped).toBe(true);
    expect(forked.persist).not.toHaveBeenCalled();
  });
});
