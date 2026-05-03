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

import {
  TossPromotionError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import type { User } from "../../user/user.entity";
import type { Prompt } from "../../prompt/prompt.entity";
import { Drawing } from "../drawing.entity";
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
  user: { userKey: 1234, name: userName },
});

const buildPromptService = () => ({
  getPreprocessedByDate: jest.fn(async () => ({
    promptId: 7,
    preprocessed: promptPreprocessed,
  })),
});

const buildPointService = (canGrant = true) => ({
  canGrantTodayPromotion: jest.fn(async () => canGrant),
  saveDrawingPointLog: jest.fn(async () => undefined),
});

const buildTossApiClient = () => ({
  getPromotionKey: jest.fn(async () => "test-key"),
  executePromotion: jest.fn(async () => undefined),
});

const buildConfigService = (nodeEnv = "test") => ({
  get: jest.fn((key: string) => (key === "NODE_ENV" ? nodeEnv : undefined)),
  getOrThrow: jest.fn((key: string) => {
    if (key === "PROMOTION_CODE") return "TEMP_PROMOTION_CODE";
    throw new Error(`Missing config: ${key}`);
  }),
});

const buildDrawingAccessService = () => ({
  validateAccess: jest.fn(async () => undefined),
});

const buildUserService = (userKey = 1234) => ({
  getUserInfo: jest.fn(async () => ({ userKey, name: "테스트유저" }) as User),
});

const buildService = ({
  em,
  userService = buildUserService(),
  promptService = buildPromptService(),
  pointService = buildPointService(),
  tossApiClient = buildTossApiClient(),
  configService = buildConfigService(),
  drawingAccessService = buildDrawingAccessService(),
}: {
  em: unknown;
  userService?: ReturnType<typeof buildUserService>;
  promptService?: ReturnType<typeof buildPromptService>;
  pointService?: ReturnType<typeof buildPointService>;
  tossApiClient?: ReturnType<typeof buildTossApiClient>;
  configService?: ReturnType<typeof buildConfigService>;
  drawingAccessService?: ReturnType<typeof buildDrawingAccessService>;
}) =>
  new DrawingService(
    em as never,
    userService as never,
    promptService as never,
    pointService as never,
    tossApiClient as never,
    configService as never,
    drawingAccessService as never,
  );

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
      const service = buildService({ em, promptService });

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
      const fakeUser = { userKey: 1234, name: "테스트유저" } as User;
      const fakePromptRef = { id: BigInt(7) } as Prompt;
      const persisted: Drawing[] = [];
      const userService = {
        getUserInfo: jest.fn(async () => fakeUser),
      };
      const drawingAccessService = buildDrawingAccessService();
      const em = {
        getReference: jest.fn(() => fakePromptRef),
        persist: jest.fn((drawing: Drawing) => {
          drawing.id = BigInt(42);
          persisted.push(drawing);
        }),
        flush: jest.fn(async () => undefined),
      };
      const service = buildService({
        em,
        userService,
        pointService: buildPointService(false),
        drawingAccessService,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(Date.UTC(2026, 3, 15)),
      );

      expect(userService.getUserInfo).toHaveBeenCalledWith(1234);
      expect(drawingAccessService.validateAccess).toHaveBeenCalledWith(
        fakeUser,
      );
      expect(persisted).toHaveLength(1);
      const saved = persisted[0];
      expect(saved.user).toBe(fakeUser);
      expect(saved.prompt).toBe(fakePromptRef);
      expect(JSON.parse(saved.strokes)).toEqual(sampleStrokes);
      expect(JSON.parse(saved.similarity).score).toBe(87);
      expect(saved.score).toBe(87);
      expect(result).toMatchObject({
        drawingId: 42,
        promotionGranted: false,
      });
      expect(result.similarity.score).toBe(87);
    });

    it("접근 권한 검증에 실패하면 그림을 저장하지 않는다", async () => {
      const em = {
        getReference: jest.fn(),
        persist: jest.fn(),
        flush: jest.fn(),
      };
      const drawingAccessService = {
        validateAccess: jest.fn(async () => {
          throw new Error("NO_CHANCE");
        }),
      };
      const service = buildService({ em, drawingAccessService });

      await expect(
        service.submitDrawing(1234, sampleStrokes as never, new Date()),
      ).rejects.toThrow("NO_CHANCE");
      expect(em.persist).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe("프로모션 지급", () => {
    const baseEm = () => ({
      getReference: jest.fn(() => ({ id: BigInt(7) })),
      persist: jest.fn((drawing: Drawing) => {
        drawing.id = BigInt(1);
      }),
      flush: jest.fn(async () => undefined),
    });

    it("일일 한도에 도달하면 Toss API를 호출하지 않는다", async () => {
      const pointService = buildPointService(false);
      const tossApiClient = buildTossApiClient();
      const service = buildService({
        em: baseEm(),
        pointService,
        tossApiClient,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(),
      );

      expect(tossApiClient.getPromotionKey).not.toHaveBeenCalled();
      expect(pointService.saveDrawingPointLog).not.toHaveBeenCalled();
      expect(result.promotionGranted).toBe(false);
    });

    it("정상 지급 시 getPromotionKey, executePromotion, saveDrawingPointLog 순서로 호출한다", async () => {
      const pointService = buildPointService(true);
      const tossApiClient = buildTossApiClient();
      const service = buildService({
        em: baseEm(),
        pointService,
        tossApiClient,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(),
      );

      expect(tossApiClient.getPromotionKey).toHaveBeenCalledWith(1234);
      expect(tossApiClient.executePromotion).toHaveBeenCalledWith(
        1234,
        "test-key",
        "TEST_TEMP_PROMOTION_CODE",
        2,
      );
      expect(pointService.saveDrawingPointLog).toHaveBeenCalledWith(1234);
      expect(result.promotionGranted).toBe(true);
    });

    it("4110 오류 시 재시도하여 성공하면 saveDrawingPointLog를 호출한다", async () => {
      const pointService = buildPointService(true);
      const tossApiClient = buildTossApiClient();
      tossApiClient.executePromotion
        .mockRejectedValueOnce(new TossPromotionError("4110", "내부 오류"))
        .mockResolvedValueOnce(undefined);
      const service = buildService({
        em: baseEm(),
        pointService,
        tossApiClient,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(),
      );

      expect(tossApiClient.getPromotionKey).toHaveBeenCalledTimes(2);
      expect(pointService.saveDrawingPointLog).toHaveBeenCalledTimes(1);
      expect(result.promotionGranted).toBe(true);
    });

    it("TossTransportError 발생 시 재시도하여 성공하면 saveDrawingPointLog를 호출한다", async () => {
      const pointService = buildPointService(true);
      const tossApiClient = buildTossApiClient();
      tossApiClient.getPromotionKey
        .mockRejectedValueOnce(new TossTransportError("타임아웃"))
        .mockResolvedValueOnce("test-key");
      const service = buildService({
        em: baseEm(),
        pointService,
        tossApiClient,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(),
      );

      expect(tossApiClient.getPromotionKey).toHaveBeenCalledTimes(2);
      expect(pointService.saveDrawingPointLog).toHaveBeenCalledTimes(1);
      expect(result.promotionGranted).toBe(true);
    });

    it("최대 재시도 모두 실패해도 submitDrawing은 정상 결과를 반환한다", async () => {
      const pointService = buildPointService(true);
      const tossApiClient = buildTossApiClient();
      tossApiClient.executePromotion.mockRejectedValue(
        new TossPromotionError("4110", "내부 오류"),
      );
      const service = buildService({
        em: baseEm(),
        pointService,
        tossApiClient,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(),
      );

      expect(tossApiClient.executePromotion).toHaveBeenCalledTimes(3);
      expect(pointService.saveDrawingPointLog).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        drawingId: 1,
        promotionGranted: false,
      });
    });

    it("재시도 불필요 에러가 발생해도 submitDrawing은 정상 결과를 반환한다", async () => {
      const pointService = buildPointService(true);
      const tossApiClient = buildTossApiClient();
      tossApiClient.getPromotionKey.mockRejectedValue(
        new TossPromotionError("4109", "프로모션이 실행중이 아니에요"),
      );
      const service = buildService({
        em: baseEm(),
        pointService,
        tossApiClient,
      });

      const result = await service.submitDrawing(
        1234,
        sampleStrokes as never,
        new Date(),
      );

      expect(tossApiClient.getPromotionKey).toHaveBeenCalledTimes(1);
      expect(pointService.saveDrawingPointLog).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        drawingId: 1,
        promotionGranted: false,
      });
    });
  });

  describe("getMyDrawings", () => {
    let service: DrawingService;
    let em: { find: jest.Mock };

    beforeEach(() => {
      em = { find: jest.fn() };
      service = buildService({ em });
    });

    it("오늘 그린 그림이 없으면 빈 배열을 반환한다", async () => {
      em.find.mockResolvedValueOnce([]);

      const result = await service.getMyDrawings(1234);

      expect(result).toEqual({ userKey: 1234, drawings: [] });
    });

    it("오늘 그린 그림이 있으면 올바른 형식으로 반환한다", async () => {
      const drawing = makeDrawing(BigInt(1), 78.5, BigInt(10));
      em.find.mockResolvedValueOnce([drawing]).mockResolvedValueOnce([drawing]);

      const result = await service.getMyDrawings(1234);

      expect(result.userKey).toBe(1234);
      expect(result.drawings[0]).toMatchObject({
        drawingId: 1,
        score: 78.5,
      });
    });

    it("나보다 score 높은 그림 수로 drawRanking을 계산한다", async () => {
      const drawing = makeDrawing(BigInt(1), 50, BigInt(10));
      const otherDrawing = makeDrawing(BigInt(2), 80, BigInt(10), "다른유저");
      em.find
        .mockResolvedValueOnce([drawing])
        .mockResolvedValueOnce([drawing, otherDrawing]);

      const result = await service.getMyDrawings(1234);

      expect(result.drawings[0].drawRanking).toBe(2);
    });

    it("다른 프롬프트의 그림은 drawRanking 계산에 포함하지 않는다", async () => {
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

      const result = await service.getMyDrawings(1234);

      expect(result.drawings[0].drawRanking).toBe(1);
    });
  });

  describe("getDrawing", () => {
    let service: DrawingService;
    let em: { findOne: jest.Mock; find: jest.Mock };

    beforeEach(() => {
      em = { findOne: jest.fn(), find: jest.fn() };
      service = buildService({ em });
    });

    it("drawingId에 해당하는 그림이 없으면 null을 반환한다", async () => {
      em.findOne.mockResolvedValueOnce(null);

      const result = await service.getDrawing("1");

      expect(result).toBeNull();
    });

    it("그림 상세를 올바른 형식으로 반환한다", async () => {
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
  });
});
