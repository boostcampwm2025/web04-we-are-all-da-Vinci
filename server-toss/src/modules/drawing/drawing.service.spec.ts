const mockPreprocessStrokes = jest.fn((strokes: unknown) => ({
  player: strokes,
}));
const mockScoreFinalSimilarity = jest.fn(() => ({
  similarity: 87,
  strokeCountSimilarity: 90,
  strokeMatchSimilarity: 85,
  shapeSimilarity: 88,
}));

jest.mock("@davinci/similarity", () => ({
  preprocessStrokes: mockPreprocessStrokes,
  scoreFinalSimilarity: mockScoreFinalSimilarity,
}));

import { NotFoundException } from "@nestjs/common";
import type { Prompt } from "../prompt/prompt.entity";
import type { User } from "../user/user.entity";
import { Drawing } from "./drawing.entity";
import { DrawingService } from "./drawing.service";

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
      expect(result.similarity).toBe(87);
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
      expect(JSON.parse(saved.similarity).similarity).toBe(87);
      expect(result.drawingId).toBe(42);
      expect(result.similarity.similarity).toBe(87);
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
});
