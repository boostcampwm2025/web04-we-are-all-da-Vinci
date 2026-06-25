jest.mock("src/common/util/time.util", () => {
  const actual = jest.requireActual<typeof import("src/common/util/time.util")>(
    "src/common/util/time.util",
  );
  return {
    ...actual,
    getSeoulDayRange: jest.fn((reference?: Date) =>
      actual.getSeoulDayRange(
        reference ?? new Date("2026-05-09T00:00:00.000Z"),
      ),
    ),
  };
});

import { ForbiddenException } from "@nestjs/common";
import { PointReason } from "src/modules/point/entity/point-log.entity";
import { AdType, AdView } from "src/modules/chance/ad-view.entity";
import { Attendance } from "./attendance.entity";
import { AttendanceService } from "./attendance.service";

const TODAY_START = new Date("2026-05-08T15:00:00.000Z");
const YESTERDAY_START = new Date("2026-05-07T15:00:00.000Z");
const THREE_DAYS_AGO = new Date("2026-05-05T15:00:00.000Z");
const RECOVERY_AD_GROUP = "ait.v2.live.recovery";

interface EmApi {
  findOne: jest.Mock;
  create: jest.Mock;
  persist: jest.Mock;
  getReference: jest.Mock;
  flush: jest.Mock;
  transactional: jest.Mock;
}

const buildEm = (existing: Partial<Attendance> | null) => {
  const created: unknown[] = [];
  const em: EmApi = {
    findOne: jest.fn(async () => existing),
    create: jest.fn((_entity, data) => {
      created.push(data);
      return data;
    }),
    persist: jest.fn(),
    getReference: jest.fn((_entity, key) => ({ userKey: key })),
    flush: jest.fn(async () => undefined),
    transactional: jest.fn(async (cb: (em: EmApi) => Promise<unknown>) =>
      cb(em),
    ),
  };
  return { em, created };
};

const buildPointService = () => ({
  enqueueGrant: jest.fn(),
  getPointSummary: jest.fn(async () => ({ totalPoints: 0, todayPoints: 0 })),
});

const buildConfigService = () => ({
  getOrThrow: jest.fn((key: string) => {
    if (key === "ATTENDANCE_AD_GROUP_ID") return RECOVERY_AD_GROUP;
    throw new Error(`unexpected key ${key}`);
  }),
});

const buildService = (
  em: unknown,
  pointService = buildPointService(),
  configService = buildConfigService(),
) => ({
  service: new AttendanceService(
    em as never,
    pointService as never,
    configService as never,
  ),
  pointService,
});

describe("출석 서비스", () => {
  afterEach(() => jest.clearAllMocks());

  describe("체크인 — 첫 출석", () => {
    it("출석 행을 생성하고 1일차 started를 반환한다", async () => {
      const { em, created } = buildEm(null);
      const { service, pointService } = buildService(em);

      const result = await service.checkIn(1234);

      expect(result).toEqual({
        status: "started",
        cycleDay: 1,
        recoverable: false,
        previousDay: null,
        rewardedDay: null,
      });
      expect(created[0]).toMatchObject({ userKey: 1234, cycleDay: 1 });
      expect(pointService.enqueueGrant).not.toHaveBeenCalled();
    });
  });

  describe("체크인 — 멱등 재호출", () => {
    it("오늘 이미 출석했으면 already를 반환하고 전이·지급이 없다", async () => {
      const { em } = buildEm({
        userKey: 1234,
        cycleDay: 3,
        lastCheckedDate: TODAY_START,
        recoverableDay: null,
      });
      const { service, pointService } = buildService(em);

      const result = await service.checkIn(1234);

      expect(result.status).toBe("already");
      expect(result.cycleDay).toBe(3);
      expect(em.flush).not.toHaveBeenCalled();
      expect(pointService.enqueueGrant).not.toHaveBeenCalled();
    });
  });

  describe("체크인 — 연속", () => {
    it("어제에 이어 2일차→3일차가 되고 마일스톤 5P를 적재한다", async () => {
      const attendance = {
        userKey: 1234,
        cycleDay: 2,
        lastCheckedDate: YESTERDAY_START,
        recoverableDay: null,
      };
      const { em } = buildEm(attendance);
      const { service, pointService } = buildService(em);

      const result = await service.checkIn(1234);

      expect(result.status).toBe("continued");
      expect(result.cycleDay).toBe(3);
      expect(result.rewardedDay).toBe(3);
      expect(attendance.cycleDay).toBe(3);
      expect(pointService.enqueueGrant).toHaveBeenCalledWith(
        expect.anything(),
        1234,
        PointReason.ATTENDANCE,
      );
    });

    it("6일차→7일차도 5P를 적재한다", async () => {
      const attendance = {
        userKey: 1234,
        cycleDay: 6,
        lastCheckedDate: YESTERDAY_START,
        recoverableDay: null,
      };
      const { em } = buildEm(attendance);
      const { service, pointService } = buildService(em);

      const result = await service.checkIn(1234);

      expect(result.cycleDay).toBe(7);
      expect(result.rewardedDay).toBe(7);
      expect(pointService.enqueueGrant).toHaveBeenCalledTimes(1);
    });

    it("7일차→1일차로 초기화되며 지급하지 않는다", async () => {
      const attendance = {
        userKey: 1234,
        cycleDay: 7,
        lastCheckedDate: YESTERDAY_START,
        recoverableDay: null,
      };
      const { em } = buildEm(attendance);
      const { service, pointService } = buildService(em);

      const result = await service.checkIn(1234);

      expect(result.cycleDay).toBe(1);
      expect(result.rewardedDay).toBeNull();
      expect(pointService.enqueueGrant).not.toHaveBeenCalled();
    });
  });

  describe("체크인 — 끊김", () => {
    it("갭이 생기면 1일차로 리셋하고 직전 위치를 복구 대상으로 보관한다", async () => {
      const attendance = {
        userKey: 1234,
        cycleDay: 4,
        lastCheckedDate: THREE_DAYS_AGO,
        recoverableDay: null,
      };
      const { em } = buildEm(attendance);
      const { service, pointService } = buildService(em);

      const result = await service.checkIn(1234);

      expect(result.status).toBe("reset_recoverable");
      expect(result.cycleDay).toBe(1);
      expect(result.recoverable).toBe(true);
      expect(result.previousDay).toBe(4);
      expect(attendance.recoverableDay).toBe(4);
      expect(attendance.cycleDay).toBe(1);
      expect(pointService.enqueueGrant).not.toHaveBeenCalled();
    });
  });

  describe("복구", () => {
    it("광고 검증 후 직전 위치+1로 복구하고 AdView를 기록한다", async () => {
      const attendance = {
        userKey: 1234,
        cycleDay: 1,
        lastCheckedDate: TODAY_START,
        recoverableDay: 2,
      };
      const { em, created } = buildEm(attendance);
      const { service } = buildService(em);

      const result = await service.recover(1234, {
        adGroupId: RECOVERY_AD_GROUP,
      });

      expect(result.cycleDay).toBe(3);
      expect(result.rewardedDay).toBe(3);
      expect(attendance.cycleDay).toBe(3);
      expect(attendance.recoverableDay).toBeNull();
      expect(em.create).toHaveBeenCalledWith(AdView, {
        type: AdType.ATTENDANCE_RECOVERY,
        user: { userKey: 1234 },
      });
      expect(created.length).toBe(1);
    });

    it("등록되지 않은 광고그룹이면 ForbiddenException", async () => {
      const { em } = buildEm({
        userKey: 1234,
        cycleDay: 1,
        lastCheckedDate: TODAY_START,
        recoverableDay: 2,
      });
      const { service } = buildService(em);

      await expect(
        service.recover(1234, { adGroupId: "ait.v2.live.other" }),
      ).rejects.toThrow(ForbiddenException);
      expect(em.transactional).not.toHaveBeenCalled();
    });

    it("복구할 연속 출석이 없으면 ForbiddenException", async () => {
      const { em } = buildEm({
        userKey: 1234,
        cycleDay: 3,
        lastCheckedDate: TODAY_START,
        recoverableDay: null,
      });
      const { service } = buildService(em);

      await expect(
        service.recover(1234, { adGroupId: RECOVERY_AD_GROUP }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("현황 조회", () => {
    it("출석 이력이 없으면 cycleDay 0 상태를 반환한다(포인트는 별도 리소스)", async () => {
      const { em } = buildEm(null);
      const { service } = buildService(em);

      const result = await service.getStatus(1234);

      expect(result).toEqual({
        cycleDay: 0,
        checkedToday: false,
        recoverable: false,
        previousDay: null,
        tomorrowMaxPoint: 0,
      });
    });

    it("오늘 2일차 출석 상태면 checkedToday=true, 내일 최대 5P를 계산한다", async () => {
      const { em } = buildEm({
        userKey: 1234,
        cycleDay: 2,
        lastCheckedDate: TODAY_START,
        recoverableDay: null,
      });
      const { service } = buildService(em);

      const result = await service.getStatus(1234);

      expect(result.cycleDay).toBe(2);
      expect(result.checkedToday).toBe(true);
      expect(result.tomorrowMaxPoint).toBe(5);
    });
  });
});
