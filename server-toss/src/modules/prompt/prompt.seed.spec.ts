import { Drawing } from "../drawing/drawing.entity";
import { DailyPrompt } from "./daily-prompt.entity";
import { Prompt } from "./prompt.entity";
import type { DatedPrompt } from "./prompt.seed";
import { PromptSeedService } from "./prompt.seed";

const buildStroke = () => ({
  points: [
    [0, 1],
    [0, 1],
  ] as [number[], number[]],
  color: [0, 0, 0] as [number, number, number],
});

const buildDaily = (date: string, id: bigint): DailyPrompt => {
  const prompt = Object.assign(new Prompt(), {
    id,
    strokes: JSON.stringify([buildStroke()]),
  });
  return Object.assign(new DailyPrompt(), {
    id,
    prompt,
    promptDate: new Date(date + "T00:00:00.000Z"),
  });
};

const setup = (
  existingDailies: DailyPrompt[],
  drawingCounts: Map<bigint, number> = new Map(),
) => {
  const persisted: (Prompt | DailyPrompt)[] = [];
  const removed: (Prompt | DailyPrompt)[] = [];

  const dailyRepo = {
    findAll: jest.fn(async () => existingDailies),
  };
  const drawingRepo = {
    count: jest.fn(async ({ prompt }: { prompt: Prompt }) =>
      drawingCounts.get(prompt.id) ?? 0,
    ),
  };

  const txEm = {
    persist: jest.fn((e: Prompt | DailyPrompt) => {
      persisted.push(e);
    }),
    remove: jest.fn((e: Prompt | DailyPrompt) => {
      removed.push(e);
    }),
    flush: jest.fn(async () => undefined),
    getRepository: jest.fn((cls: unknown) => {
      if (cls === DailyPrompt) return dailyRepo;
      if (cls === Drawing) return drawingRepo;
    }),
  };

  const em = {
    fork: jest.fn(() => ({
      transactional: jest.fn(
        async (cb: (em: typeof txEm) => Promise<void>) => cb(txEm),
      ),
    })),
  };

  const service = new PromptSeedService(em as never);
  return { service, persisted, removed };
};

describe("PromptSeedService", () => {
  const stroke = buildStroke();

  describe("syncPrompts", () => {
    it("빈 DB에서 JSON 항목 전체를 삽입한다", async () => {
      const { service, persisted, removed } = setup([]);
      const data: DatedPrompt[] = [
        { date: "2026-07-01", strokes: [stroke] },
        { date: "2026-07-02", strokes: [stroke] },
      ];

      const result = await service.syncPrompts(data);

      expect(removed).toHaveLength(0);
      expect(persisted.filter((e) => e instanceof Prompt)).toHaveLength(2);
      expect(persisted.filter((e) => e instanceof DailyPrompt)).toHaveLength(2);
      expect(result).toEqual({
        added: 2,
        deleted: 0,
        protected: 0,
        displaced: 0,
      });
    });

    it("drawing 없는 기존 프롬프트는 삭제하고 JSON을 삽입한다", async () => {
      const existing = [buildDaily("2026-04-01", 1n)];
      const { service, persisted, removed } = setup(existing);
      const data: DatedPrompt[] = [{ date: "2026-05-01", strokes: [stroke] }];

      const result = await service.syncPrompts(data);

      // DailyPrompt + Prompt 각 1개씩 삭제
      expect(removed).toHaveLength(2);
      expect(persisted.filter((e) => e instanceof Prompt)).toHaveLength(1);
      expect(result).toEqual({
        added: 1,
        deleted: 1,
        protected: 0,
        displaced: 0,
      });
    });

    it("drawing 있는 기존 프롬프트는 삭제하지 않는다", async () => {
      const existing = [buildDaily("2026-04-01", 1n)];
      const { service, removed, persisted } = setup(
        existing,
        new Map([[1n, 1]]),
      );
      const data: DatedPrompt[] = [{ date: "2026-05-01", strokes: [stroke] }];

      const result = await service.syncPrompts(data);

      expect(removed).toHaveLength(0);
      // 새 JSON 항목은 정상 삽입됨
      expect(persisted.filter((e) => e instanceof DailyPrompt)).toHaveLength(1);
      expect(result).toEqual({
        added: 1,
        deleted: 0,
        protected: 1,
        displaced: 0,
      });
    });

    it("JSON 날짜가 protected 날짜와 충돌하면 마지막 날짜 다음으로 삽입한다", async () => {
      // protected: 2026-07-03 / JSON 마지막 날짜: 2026-07-03 → 다음 빈 날짜: 2026-07-04
      const existing = [buildDaily("2026-07-03", 1n)];
      const { service, persisted } = setup(existing, new Map([[1n, 1]]));
      const data: DatedPrompt[] = [{ date: "2026-07-03", strokes: [stroke] }];

      const result = await service.syncPrompts(data);

      const dailies = persisted.filter(
        (e) => e instanceof DailyPrompt,
      ) as DailyPrompt[];
      expect(dailies[0].promptDate.toISOString()).toBe(
        "2026-07-04T00:00:00.000Z",
      );
      expect(result).toEqual({
        added: 1,
        deleted: 0,
        protected: 1,
        displaced: 1,
      });
    });

    it("displaced 후보 날짜도 이미 사용 중이면 그 다음 날짜를 사용한다", async () => {
      // protected: 2026-07-03, 2026-07-04 → 첫 번째 displaced: 2026-07-05, 두 번째: 2026-07-06
      const existing = [
        buildDaily("2026-07-03", 1n),
        buildDaily("2026-07-04", 2n),
      ];
      const { service, persisted } = setup(
        existing,
        new Map([
          [1n, 1],
          [2n, 1],
        ]),
      );
      const data: DatedPrompt[] = [
        { date: "2026-07-03", strokes: [stroke] },
        { date: "2026-07-04", strokes: [stroke] },
      ];

      const result = await service.syncPrompts(data);

      const dailies = persisted.filter(
        (e) => e instanceof DailyPrompt,
      ) as DailyPrompt[];
      expect(dailies[0].promptDate.toISOString()).toBe(
        "2026-07-05T00:00:00.000Z",
      );
      expect(dailies[1].promptDate.toISOString()).toBe(
        "2026-07-06T00:00:00.000Z",
      );
      expect(result.displaced).toBe(2);
    });
  });
});
