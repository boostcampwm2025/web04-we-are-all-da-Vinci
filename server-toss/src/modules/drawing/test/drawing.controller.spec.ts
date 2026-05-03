import { INestApplication, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";
import { ZodExceptionFilter } from "../../../common/zod-exception.filter";
import { DrawingController } from "../drawing.controller";
import { DrawingService } from "../service/drawing.service";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";

describe("DrawingController (e2e)", () => {
  let app: INestApplication<App>;
  const drawingService = {
    scoreStrokes: jest.fn(),
    submitDrawing: jest.fn(),
  };

  const validPayload = {
    strokes: [
      {
        points: [
          [10, 20],
          [10, 20],
        ],
        color: [0, 0, 0],
      },
    ],
  };
  const similarity = {
    similarity: 50,
    strokeCountSimilarity: 50,
    strokeMatchSimilarity: 50,
    shapeSimilarity: 50,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrawingController],
      providers: [{ provide: DrawingService, useValue: drawingService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new ZodExceptionFilter());
    app.useGlobalGuards(JwtAuthGuard);
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe("POST /strokes", () => {
    it("유효한 payload는 201과 similarity를 반환한다", async () => {
      drawingService.scoreStrokes.mockResolvedValue(similarity);

      const res = await request(app.getHttpServer())
        .post("/strokes")
        .send(validPayload)
        .expect(201);
      expect(res.body).toEqual(similarity);
    });

    it("잘못된 payload는 400을 반환한다", async () => {
      await request(app.getHttpServer())
        .post("/strokes")
        .send({ strokes: "bad" })
        .expect(400);
      expect(drawingService.scoreStrokes).not.toHaveBeenCalled();
    });
  });

  describe("POST /drawing", () => {
    it("유효한 payload는 drawingId와 similarity를 반환한다", async () => {
      drawingService.submitDrawing.mockResolvedValue({
        drawingId: 42,
        similarity,
      });

      const res = await request(app.getHttpServer())
        .post("/drawing")
        .send({ userKey: "1234", ...validPayload })
        .expect(201);
      expect(res.body).toEqual({ drawingId: 42, similarity });
    });

    it("userKey 없는 payload는 400을 반환한다", async () => {
      await request(app.getHttpServer())
        .post("/drawing")
        .send(validPayload)
        .expect(400);
    });

    it("서비스가 NotFoundException을 던지면 404를 반환한다", async () => {
      drawingService.submitDrawing.mockRejectedValue(
        new NotFoundException("USER_NOT_FOUND"),
      );

      await request(app.getHttpServer())
        .post("/drawing")
        .send({ userKey: "9999", ...validPayload })
        .expect(404);
    });
  });
});
