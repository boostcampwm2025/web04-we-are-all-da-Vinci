jest.mock("@mikro-orm/core", () => ({
  EntityRepositoryType: Symbol("EntityRepositoryType"),
  EntityManager: class {},
  QueryOrder: { ASC: "asc", DESC: "desc" },
}));

const mockPreprocessStrokes = jest.fn((strokes: unknown) => ({
  player: strokes,
}));
const mockScoreFinalSimilarity = jest.fn(() => ({
  score: 87,
  strokeMatchSimilarity: 85,
  shapeSimilarity: 88,
  penalty: 5,
}));

jest.mock("@davinci/similarity", () => ({
  preprocessStrokes: mockPreprocessStrokes,
  scoreFinalSimilarity: mockScoreFinalSimilarity,
}));

jest.mock("src/common/time.util", () => ({
  getSeoulDayRange: () => ({
    start: new Date("2026-04-26T15:00:00.000Z"),
    end: new Date("2026-04-27T15:00:00.000Z"),
  }),
}));

import { NotFoundException } from "@nestjs/common";
import type { Prompt } from "../prompt/prompt.entity";
import type { User } from "../user/user.entity";
import { Drawing } from "./drawing.entity";
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

const sampleStrokes = [
  {
    points: [
      [0, 1],
      [0, 1],
    ],
    color: [0, 0, 0],
  },
];

const promptPreprocessed = { prompt: "preprocessed" };

const buildPromptService = () => ({
  getPreprocessedByDate: jest.fn(async () => ({
    promptId: 7,
    preprocessed: promptPreprocessed,
  })),
});

describe("DrawingService", () => {
  beforeEach(() => {
    mockPreprocessStrokes.mockClear();
    mockScoreFinalSimilarity.mockClear();
  });

  describe("스트로크 점수 계산", () => {
    it("오늘 프롬프트 기반 Similarity를 계산해 반환한다", async () => {
      const promptService = buildPromptService();
      const em = {
        getReference: jest.fn(),
        persist: jest.fn(),
        flush: jest.fn(),
      };
      const userRepo = { findOne: jest.fn() };
      const service = new DrawingService(
        em as never,
        userRepo as never,
        promptService as never,
      );

      const result = await service.scoreStrokes(
        sampleStrokes as never,
        new Date(Date.UTC(2026, 3, 15)),
      );

      expect(mockPreprocessStrokes).toHaveBeenCalledWith(sampleStrokes);
      expect(mockScoreFinalSimilarity).toHaveBeenCalledWith(
        promptPreprocessed,
        { player: sampleStrokes },
      );
      expect(result.score).toBe(87);
      expect(em.persist).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe("드로잉 제출", () => {
    it("유효한 userKey와 strokes를 받으면 drawings를 저장하고 결과를 반환한다", async () => {
      const promptService = buildPromptService();
      const fakeUser = { id: BigInt(1) } as User;
      const fakePromptRef = { id: BigInt(7) } as Prompt;
      const userRepo = { findOne: jest.fn(async () => fakeUser) };
      const persisted: Drawing[] = [];
      const em = {
        getReference: jest.fn(() => fakePromptRef),
        persist: jest.fn((drawing: Drawing) => {
          drawing.id = BigInt(42);
          persisted.push(drawing);
        }),
        flush: jest.fn(async () => undefined),
      };
      const service = new DrawingService(
        em as never,
        userRepo as never,
        promptService as never,
      );

      const result = await service.submitDrawing(
        "1234",
        sampleStrokes as never,
        new Date(Date.UTC(2026, 3, 15)),
      );

      expect(userRepo.findOne).toHaveBeenCalledWith({ userKey: 1234 });
      expect(persisted).toHaveLength(1);
      const saved = persisted[0];
      expect(saved.user).toBe(fakeUser);
      expect(saved.prompt).toBe(fakePromptRef);
      expect(JSON.parse(saved.strokes)).toEqual(sampleStrokes);
      expect(JSON.parse(saved.similarity).score).toBe(87);
      expect(saved.score).toBe(87);
      expect(result.drawingId).toBe(42);
      expect(result.similarity.score).toBe(87);
    });

    it("userKey에 해당하는 사용자가 없으면 NotFoundException을 던진다", async () => {
      const promptService = buildPromptService();
      const em = {
        getReference: jest.fn(),
        persist: jest.fn(),
        flush: jest.fn(),
      };
      const userRepo = { findOne: jest.fn(async () => null) };
      const service = new DrawingService(
        em as never,
        userRepo as never,
        promptService as never,
      );

      await expect(
        service.submitDrawing(
          "9999",
          sampleStrokes as never,
          new Date(Date.UTC(2026, 3, 15)),
        ),
      ).rejects.toThrow(NotFoundException);
      expect(em.persist).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe("getMyDrawings", () => {
    let service: DrawingService;
    let em: { find: jest.Mock };

    beforeEach(() => {
      em = { find: jest.fn() };
      service = new DrawingService(em as never, {} as never, {} as never);
    });

    it("오늘 그린 그림이 없으면 빈 배열 반환", async () => {
      em.find.mockResolvedValueOnce([]);

      const result = await service.getMyDrawings(BigInt(1));

      expect(result).toEqual({ userId: "1", drawings: [] });
    });

    it("오늘 그린 그림이 있으면 올바른 형식으로 반환", async () => {
      const drawing = makeDrawing(BigInt(1), 78.5, BigInt(10));
      em.find.mockResolvedValueOnce([drawing]).mockResolvedValueOnce([drawing]);

      const result = await service.getMyDrawings(BigInt(1));

      expect(result.userId).toBe("1");
      expect(result.drawings).toHaveLength(1);
      expect(result.drawings[0]).toMatchObject({
        drawingId: 1,
        score: 78.5,
      });
    });

    it("나보다 score 높은 그림이 없으면 drawRanking이 1", async () => {
      const drawing = makeDrawing(BigInt(1), 80, BigInt(10));
      const otherDrawing = makeDrawing(BigInt(2), 50, BigInt(10), "다른유저");
      em.find
        .mockResolvedValueOnce([drawing])
        .mockResolvedValueOnce([drawing, otherDrawing]);

      const result = await service.getMyDrawings(BigInt(1));

      expect(result.drawings[0].drawRanking).toBe(1);
    });

    it("나보다 score 높은 그림이 1개면 drawRanking이 2", async () => {
      const drawing = makeDrawing(BigInt(1), 50, BigInt(10));
      const otherDrawing = makeDrawing(BigInt(2), 80, BigInt(10), "다른유저");
      em.find
        .mockResolvedValueOnce([drawing])
        .mockResolvedValueOnce([drawing, otherDrawing]);

      const result = await service.getMyDrawings(BigInt(1));

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

      const result = await service.getMyDrawings(BigInt(1));

      expect(result.drawings[0].drawRanking).toBe(1);
    });

    it("strokes와 similarity를 JSON 파싱하여 반환", async () => {
      const drawing = makeDrawing(BigInt(1), 78.5, BigInt(10));
      em.find.mockResolvedValueOnce([drawing]).mockResolvedValueOnce([drawing]);

      const result = await service.getMyDrawings(BigInt(1));

      expect(result.drawings[0].strokes).toEqual([
        { points: [[0], [0]], color: [255, 0, 0] },
      ]);
      expect(result.drawings[0].similarity).toMatchObject({ score: 78.5 });
    });
  });

  describe("getDrawing", () => {
    let service: DrawingService;
    let em: { findOne: jest.Mock; find: jest.Mock };

    beforeEach(() => {
      em = { findOne: jest.fn(), find: jest.fn() };
      service = new DrawingService(em as never, {} as never, {} as never);
    });

    it("drawingId에 해당하는 그림이 없으면 null 반환", async () => {
      em.findOne.mockResolvedValueOnce(null);

      const result = await service.getDrawing("1");

      expect(result).toBeNull();
    });

    it("올바른 형식으로 반환 (drawingId, name, drawRanking, strokes, similarity)", async () => {
      const drawing = makeDrawing(BigInt(1), 78.5, BigInt(10), "홍길동");
      em.findOne.mockResolvedValueOnce(drawing);
      em.find.mockResolvedValueOnce([drawing]);

      const result = await service.getDrawing("1");

      expect(result).toMatchObject({
        drawingId: 1,
        name: "홍길동",
        drawRanking: 1,
      });
      expect(result!.strokes).toEqual([
        { points: [[0], [0]], color: [255, 0, 0] },
      ]);
      expect(result!.similarity).toMatchObject({ score: 78.5 });
    });

    it("나보다 score 높은 그림이 없으면 drawRanking이 1", async () => {
      const drawing = makeDrawing(BigInt(1), 80, BigInt(10));
      const otherDrawing = makeDrawing(BigInt(2), 50, BigInt(10), "다른유저");
      em.findOne.mockResolvedValueOnce(drawing);
      em.find.mockResolvedValueOnce([drawing, otherDrawing]);

      const result = await service.getDrawing("1");

      expect(result!.drawRanking).toBe(1);
    });

    it("나보다 score 높은 그림이 1개면 drawRanking이 2", async () => {
      const drawing = makeDrawing(BigInt(1), 50, BigInt(10));
      const otherDrawing = makeDrawing(BigInt(2), 80, BigInt(10), "다른유저");
      em.findOne.mockResolvedValueOnce(drawing);
      em.find.mockResolvedValueOnce([drawing, otherDrawing]);

      const result = await service.getDrawing("1");

      expect(result!.drawRanking).toBe(2);
    });
  });
});
