import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";
import { ZodExceptionFilter } from "../../common/zod-exception.filter";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { PointController } from "./point.controller";
import { PointService } from "./point.service";

describe("포인트 API(PointController (e2e))", () => {
  let app: INestApplication<App>;
  const pointService = { getPointSummary: jest.fn() };
  const mockAuthGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userKey: 1234 };
      return true;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointController],
      providers: [{ provide: PointService, useValue: pointService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new ZodExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  describe("포인트 요약 조회(GET /points/me)", () => {
    it("포인트 요약을 200으로 반환한다", async () => {
      pointService.getPointSummary.mockResolvedValue({
        totalPoints: 30,
        todayPoints: 5,
      });

      const res = await request(app.getHttpServer())
        .get("/points/me")
        .expect(200);

      expect(res.body).toEqual({ totalPoints: 30, todayPoints: 5 });
      expect(pointService.getPointSummary).toHaveBeenCalledWith(1234);
    });
  });
});
