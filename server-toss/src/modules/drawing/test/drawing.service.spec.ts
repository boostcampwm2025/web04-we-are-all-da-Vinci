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

jest.mock("src/common/util/time.util", () => ({
  getSeoulDayRange: () => ({
    start: new Date("2026-04-26T15:00:00.000Z"),
    end: new Date("2026-04-27T15:00:00.000Z"),
  }),
}));

import { Stroke } from "@toss/shared";
import type { User } from "../../user/user.entity";
import { SaveDrawingDto } from "../dto/save-drawing.dto";
import { DrawingService } from "../service/drawing.service";

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

const makeDrawing = (
  id: bigint,
  score: number,
  promptId: bigint,
  userNickname = "테스트닉네임",
) => ({
  id,
  createdAt: new Date("2026-04-27T09:00:00.000Z"),
  score,
  strokes: JSON.stringify([{ points: [[0], [0]], color: [255, 0, 0] }]),
  similarity: JSON.stringify({
    score,
    strokeMatchSimilarity: 30.5,
    shapeSimilarity: 50.2,
    penalty: 10.0,
  }),
  prompt: { id: promptId },
  user: { userKey: 1234, name: "테스트유저", nickname: userNickname },
});

const buildPromptService = () => ({
  getPreprocessedByDate: jest.fn(async () => ({
    promptId: 7,
    preprocessed: promptPreprocessed,
  })),
});

const buildUserService = (userKey = 1234) => ({
  getUserInfo: jest.fn(async () => ({ userKey, name: "테스트유저" }) as User),
});

const buildDrawingRepository = () => ({
  findMyDrawings: jest.fn(),
  saveDrawing: jest.fn(),
  findDrawingById: jest.fn(),
});

const buildSaveDrawingService = () => ({
  saveDrawingWithRanking: jest.fn(),
});

const buildService = ({
  userService = buildUserService(),
  promptService = buildPromptService(),
  drawingRepository = buildDrawingRepository(),
  saveDrawingService = buildSaveDrawingService(),
}: {
  userService?: ReturnType<typeof buildUserService>;
  promptService?: ReturnType<typeof buildPromptService>;
  drawingRepository?: ReturnType<typeof buildDrawingRepository>;
  saveDrawingService?: ReturnType<typeof buildSaveDrawingService>;
}) =>
  new DrawingService(
    userService as never,
    promptService as never,
    drawingRepository as never,
    saveDrawingService as never,
    { emit: jest.fn() } as never,
  );

describe("DrawingService", () => {
  beforeEach(() => {
    mockPreprocessStrokes.mockClear();
    mockScoreFinalSimilarity.mockClear();
  });

  describe("스트로크 점수 계산", () => {
    it("오늘 프롬프트 기반 Similarity를 계산해 반환한다", async () => {
      const promptService = buildPromptService();
      const drawingRepository = buildDrawingRepository();
      const service = buildService({ promptService, drawingRepository });

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
      expect(drawingRepository.saveDrawing).not.toHaveBeenCalled();
    });
  });

  describe("최종 제출", () => {
    it("유효한 userKey와 strokes를 받으면 drawings를 저장하고 결과를 반환한다", async () => {
      const fakeUser = { userKey: 1234, name: "테스트유저" } as User;
      const userService = {
        getUserInfo: jest.fn(async () => fakeUser),
      };
      const saveDrawingService = buildSaveDrawingService();
      saveDrawingService.saveDrawingWithRanking.mockResolvedValue({
        drawing: { id: BigInt(42) },
        rankingChange: { changed: false },
        promotionGranted: true,
      });

      const service = buildService({
        userService,
        saveDrawingService,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(Date.UTC(2026, 3, 15)),
      );

      expect(userService.getUserInfo).toHaveBeenCalledWith(1234);
      expect(saveDrawingService.saveDrawingWithRanking).toHaveBeenCalledTimes(
        1,
      );
      expect(saveDrawingService.saveDrawingWithRanking).toHaveBeenCalledWith(
        fakeUser,
        new SaveDrawingDto(7, sampleStrokes as Stroke[], {
          score: 87,
          strokeMatchSimilarity: 85,
          shapeSimilarity: 88,
          penalty: 5,
        }),
      );
      expect(result).toMatchObject({
        drawingId: 42,
        promotionGranted: true,
      });
      expect(result.similarity.score).toBe(87);
    });

    it("프로모션 지급은 PointService에 위임하고 결과를 그대로 반환한다", async () => {
      const drawingRepository = buildDrawingRepository();
      const saveDrawingService = buildSaveDrawingService();
      saveDrawingService.saveDrawingWithRanking.mockResolvedValue({
        drawing: { id: BigInt(1) },
        rankingChange: { changed: false },
        promotionGranted: true,
      });
      drawingRepository.saveDrawing.mockResolvedValue({ id: BigInt(1) });

      const service = buildService({
        drawingRepository,
        saveDrawingService,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(),
      );
      expect(result.promotionGranted).toBe(true);
    });
  });

  describe("내 그림 조회", () => {
    let service: DrawingService;
    let drawingRepository: ReturnType<typeof buildDrawingRepository>;

    beforeEach(() => {
      drawingRepository = buildDrawingRepository();
      service = buildService({
        drawingRepository,
      });
    });

    it("오늘 그린 그림이 없으면 빈 배열을 반환한다", async () => {
      drawingRepository.findMyDrawings.mockResolvedValueOnce([]);

      const result = await service.getMyDrawings(1234);

      expect(result).toEqual({ userKey: 1234, drawings: [] });
      expect(drawingRepository.findMyDrawings).toHaveBeenCalledWith(1234);
    });

    it("오늘 그린 그림이 있으면 올바른 형식으로 반환한다", async () => {
      const myDrawing = {
        id: BigInt(1),
        strokes: JSON.stringify([{ points: [[0], [0]], color: [255, 0, 0] }]),
        similarity: JSON.stringify({
          score: 78.5,
          strokeMatchSimilarity: 30.5,
          shapeSimilarity: 50.2,
          penalty: 10.0,
        }),
      };
      drawingRepository.findMyDrawings.mockResolvedValueOnce([myDrawing]);

      const result = await service.getMyDrawings(1234);

      expect(result).toEqual({
        userKey: 1234,
        drawings: [
          {
            drawingId: 1,
            strokes: [{ points: [[0], [0]], color: [255, 0, 0] }],
            similarity: {
              score: 78.5,
              strokeMatchSimilarity: 30.5,
              shapeSimilarity: 50.2,
              penalty: 10,
            },
          },
        ],
      });
      expect(drawingRepository.findMyDrawings).toHaveBeenCalledWith(1234);
    });
  });

  describe("그림 상세 조회", () => {
    let service: DrawingService;
    let drawingRepository: ReturnType<typeof buildDrawingRepository>;

    beforeEach(() => {
      drawingRepository = buildDrawingRepository();
      service = buildService({ drawingRepository });
    });

    it("drawingId에 해당하는 그림이 없으면 NotFoundException을 던진다", async () => {
      drawingRepository.findDrawingById.mockResolvedValueOnce(null);

      await expect(service.getDrawing(BigInt(1))).rejects.toThrow(
        "NOT_FOUND_DRAWING",
      );
      expect(drawingRepository.findDrawingById).toHaveBeenCalledWith(BigInt(1));
    });

    it("그림 상세를 올바른 형식으로 반환한다", async () => {
      const drawing = makeDrawing(BigInt(1), 78.5, BigInt(10), "랭킹닉");
      drawingRepository.findDrawingById.mockResolvedValueOnce(drawing);

      const result = await service.getDrawing(BigInt(1));

      expect(result).toMatchObject({
        drawingId: 1,
        nickname: "랭킹닉",
      });
      expect(result.strokes).toEqual([
        { points: [[0], [0]], color: [255, 0, 0] },
      ]);
      expect(result.similarity).toMatchObject({ score: 78.5 });
      expect(drawingRepository.findDrawingById).toHaveBeenCalledWith(BigInt(1));
    });
  });
});
