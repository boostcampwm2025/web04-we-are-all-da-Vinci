import { ForbiddenException, INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";
import { ZodExceptionFilter } from "../../common/zod-exception.filter";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

describe("AttendanceController (e2e)", () => {
  let app: INestApplication<App>;
  const attendanceService = {
    getStatus: jest.fn(),
    checkIn: jest.fn(),
    recover: jest.fn(),
  };
  const mockAuthGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userKey: 1234 };
      return true;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: attendanceService }],
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

  describe("POST /attendance/check-in", () => {
    it("체크인 결과를 200으로 반환한다", async () => {
      const payload = {
        status: "continued",
        cycleDay: 3,
        recoverable: false,
        previousDay: null,
        rewardedDay: 3,
      };
      attendanceService.checkIn.mockResolvedValue(payload);

      const res = await request(app.getHttpServer())
        .post("/attendance/check-in")
        .expect(200);

      expect(res.body).toEqual(payload);
      expect(attendanceService.checkIn).toHaveBeenCalledWith(1234);
    });
  });

  describe("GET /attendance/me", () => {
    it("출석 현황을 200으로 반환한다", async () => {
      const status = {
        cycleDay: 2,
        checkedToday: true,
        recoverable: false,
        previousDay: null,
        tomorrowMaxPoint: 5,
        totalPoints: 30,
        todayPoints: 5,
      };
      attendanceService.getStatus.mockResolvedValue(status);

      const res = await request(app.getHttpServer())
        .get("/attendance/me")
        .expect(200);

      expect(res.body).toEqual(status);
    });
  });

  describe("POST /attendance/recover", () => {
    it("유효한 payload는 복구 결과를 200으로 반환한다", async () => {
      attendanceService.recover.mockResolvedValue({
        cycleDay: 3,
        rewardedDay: 3,
      });

      const res = await request(app.getHttpServer())
        .post("/attendance/recover")
        .send({ sdkPayload: { adGroupId: "ait.v2.live.932e847f2b0c499c" } })
        .expect(200);

      expect(res.body).toEqual({ cycleDay: 3, rewardedDay: 3 });
      expect(attendanceService.recover).toHaveBeenCalledWith(1234, {
        adGroupId: "ait.v2.live.932e847f2b0c499c",
      });
    });

    it("sdkPayload가 없으면 400을 반환한다", async () => {
      await request(app.getHttpServer())
        .post("/attendance/recover")
        .send({})
        .expect(400);
      expect(attendanceService.recover).not.toHaveBeenCalled();
    });

    it("서비스가 ForbiddenException을 던지면 403을 반환한다", async () => {
      attendanceService.recover.mockRejectedValue(
        new ForbiddenException("복구할 연속 출석이 없어요."),
      );

      await request(app.getHttpServer())
        .post("/attendance/recover")
        .send({ sdkPayload: { adGroupId: "ait.v2.live.932e847f2b0c499c" } })
        .expect(403);
    });
  });
});
