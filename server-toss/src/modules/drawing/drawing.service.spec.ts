jest.mock("@mikro-orm/core", () => ({
  EntityRepositoryType: Symbol("EntityRepositoryType"),
  EntityManager: class {},
  QueryOrder: {
    ASC: "asc",
    DESC: "desc",
  },
}));
jest.mock("@mikro-orm/decorators/legacy", () => ({
  Entity: () => () => undefined,
  ManyToOne: () => () => undefined,
  PrimaryKey: () => () => undefined,
  Property: () => () => undefined,
}));
jest.mock("@mikro-orm/nestjs", () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock("@mikro-orm/mysql", () => ({
  EntityRepository: class {},
  EntityManager: class {},
  QueryOrder: {
    ASC: "asc",
    DESC: "desc",
  },
}));
jest.mock("src/common/time.util", () => ({
  getSeoulDayRange: () => ({
    start: new Date("2026-04-26T15:00:00.000Z"),
    end: new Date("2026-04-27T15:00:00.000Z"),
  }),
}));

import { DrawingService } from "./drawing.service";

const makeDrawing = (
  id: bigint,
  score: number,
  promptId: bigint,
  userName = "테스트유저",
) => ({
  id,
  score,
  strokes: JSON.stringify([{ points: [[0], [0]], color: [255, 0, 0] }]),
  similarity: JSON.stringify({
    score,
    strokeMatchSimilarity: 30.5,
    shapeSimilarity: 50.2,
    penalty: 10.0,
  }),
  prompt: { id: promptId },
  user: { id: BigInt(1), name: userName },
});

describe("DrawingService", () => {
  let service: DrawingService;
  let em: { find: jest.Mock };

  beforeEach(() => {
    em = { find: jest.fn() };
    service = new DrawingService(em as never);
  });

  describe("getMyDrawings", () => {
    it("오늘 그린 그림이 없으면 빈 배열 반환", async () => {
      em.find.mockResolvedValueOnce([]);

      const result = await service.getMyDrawings("1");

      expect(result).toEqual({ userId: "1", drawings: [] });
    });

    it("오늘 그린 그림이 있으면 올바른 형식으로 반환", async () => {
      const drawing = makeDrawing(BigInt(1), 78.5, BigInt(10));
      em.find.mockResolvedValueOnce([drawing]).mockResolvedValueOnce([drawing]);

      const result = await service.getMyDrawings("1");

      expect(result.userId).toBe("1");
      expect(result.drawings).toHaveLength(1);
      expect(result.drawings[0]).toMatchObject({
        drawingId: BigInt(1),
        score: 78.5,
      });
    });

    it("나보다 score 높은 그림이 없으면 drawRanking이 1", async () => {
      const drawing = makeDrawing(BigInt(1), 80, BigInt(10));
      const otherDrawing = makeDrawing(BigInt(2), 50, BigInt(10), "다른유저");
      em.find
        .mockResolvedValueOnce([drawing])
        .mockResolvedValueOnce([drawing, otherDrawing]);

      const result = await service.getMyDrawings("1");

      expect(result.drawings[0].drawRanking).toBe(1);
    });

    it("나보다 score 높은 그림이 1개면 drawRanking이 2", async () => {
      const drawing = makeDrawing(BigInt(1), 50, BigInt(10));
      const otherDrawing = makeDrawing(BigInt(2), 80, BigInt(10), "다른유저");
      em.find
        .mockResolvedValueOnce([drawing])
        .mockResolvedValueOnce([drawing, otherDrawing]);

      const result = await service.getMyDrawings("1");

      expect(result.drawings[0].drawRanking).toBe(2);
    });

    it("다른 프롬프트의 그림은 drawRanking 계산에 포함되지 않음", async () => {
      const drawing = makeDrawing(BigInt(1), 50, BigInt(10));
      const otherPromptDrawing = makeDrawing(
        BigInt(2),
        90,
        BigInt(99),
        "다른유저",
      );
      em.find
        .mockResolvedValueOnce([drawing])
        .mockResolvedValueOnce([drawing, otherPromptDrawing]);

      const result = await service.getMyDrawings("1");

      expect(result.drawings[0].drawRanking).toBe(1);
    });

    it("strokes와 similarity를 JSON 파싱하여 반환", async () => {
      const drawing = makeDrawing(BigInt(1), 78.5, BigInt(10));
      em.find.mockResolvedValueOnce([drawing]).mockResolvedValueOnce([drawing]);

      const result = await service.getMyDrawings("1");

      expect(result.drawings[0].strokes).toEqual([
        { points: [[0], [0]], color: [255, 0, 0] },
      ]);
      expect(result.drawings[0].similarity).toMatchObject({ score: 78.5 });
    });
  });

  describe("getBestDrawing", () => {
    it("오늘 그린 그림이 없으면 null 반환", async () => {
      em.find.mockResolvedValueOnce([]);

      const result = await service.getBestDrawing("1");

      expect(result).toBeNull();
    });

    it("오늘 그린 그림이 있으면 score 가장 높은 그림 반환", async () => {
      const best = makeDrawing(BigInt(1), 90, BigInt(10), "홍길동");
      const second = makeDrawing(BigInt(2), 60, BigInt(10), "홍길동");
      em.find.mockResolvedValueOnce([best, second]);

      const result = await service.getBestDrawing("1");

      expect(result).not.toBeNull();
      expect(result!.score).toBe(90);
    });

    it("올바른 형식으로 반환 (userId, name, strokes, score, similarity)", async () => {
      const drawing = makeDrawing(BigInt(1), 78.5, BigInt(10), "홍길동");
      em.find.mockResolvedValueOnce([drawing]);

      const result = await service.getBestDrawing("1");

      expect(result).toMatchObject({
        userId: "1",
        name: "홍길동",
        score: 78.5,
      });
      expect(result!.strokes).toEqual([
        { points: [[0], [0]], color: [255, 0, 0] },
      ]);
      expect(result!.similarity).toMatchObject({ score: 78.5 });
    });
  });
});
