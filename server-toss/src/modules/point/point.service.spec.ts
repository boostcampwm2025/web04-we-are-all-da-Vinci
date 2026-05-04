jest.mock("src/common/util/time.util", () => ({
  getSeoulDayRange: () => ({
    start: new Date("2026-05-03T15:00:00.000Z"),
    end: new Date("2026-05-04T15:00:00.000Z"),
  }),
}));

import {
  TossPromotionError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import { PointService } from "./point.service";
import { PointLog, PointReason } from "./point-log.entity";
import { User } from "src/modules/user/user.entity";

const buildEm = (countResult = 0) => {
  const fork = {
    count: jest.fn(async () => countResult),
    getReference: jest.fn((entity, id) => ({ __ref: entity, id })),
    persist: jest.fn(),
    flush: jest.fn(async () => undefined),
  };
  return {
    fork,
    em: { fork: jest.fn(() => fork) },
  };
};

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

const buildService = ({
  em,
  tossApiClient = buildTossApiClient(),
  configService = buildConfigService(),
}: {
  em: unknown;
  tossApiClient?: ReturnType<typeof buildTossApiClient>;
  configService?: ReturnType<typeof buildConfigService>;
}) =>
  new PointService(em as never, tossApiClient as never, configService as never);

describe("PointService", () => {
  describe("canGrantTodayPromotion", () => {
    it("오늘 지급된 횟수가 2 미만이면 true를 반환한다", async () => {
      const { em, fork } = buildEm(1);
      const service = buildService({ em });

      await expect(service.canGrantTodayPromotion(1234)).resolves.toBe(true);
      expect(em.fork).toHaveBeenCalled();
      expect(fork.count).toHaveBeenCalledWith(PointLog, {
        user: { userKey: 1234 },
        reason: PointReason.DRAWING,
        createdAt: {
          $gte: new Date("2026-05-03T15:00:00.000Z"),
          $lt: new Date("2026-05-04T15:00:00.000Z"),
        },
      });
    });

    it("이미 2회 지급되었으면 false를 반환한다", async () => {
      const { em } = buildEm(2);
      const service = buildService({ em });

      await expect(service.canGrantTodayPromotion(1234)).resolves.toBe(false);
    });
  });

  describe("saveDrawingPointLog", () => {
    it("forked em으로 PointLog를 저장한다", async () => {
      const { em, fork } = buildEm();
      const service = buildService({ em });

      await service.saveDrawingPointLog(1234);

      expect(fork.getReference).toHaveBeenCalledWith(User, 1234);
      expect(fork.persist).toHaveBeenCalledTimes(1);
      const persisted = fork.persist.mock.calls[0][0];
      expect(persisted.reason).toBe(PointReason.DRAWING);
      expect(persisted.pointAmount).toBe(2);
      expect(fork.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe("grantDrawingPromotionIfEligible", () => {
    it("일일 한도에 도달하면 Toss API를 호출하지 않는다", async () => {
      const { em } = buildEm(2);
      const tossApiClient = buildTossApiClient();
      const service = buildService({ em, tossApiClient });

      const result = await service.grantDrawingPromotionIfEligible(1234);

      expect(result).toBe(false);
      expect(tossApiClient.getPromotionKey).not.toHaveBeenCalled();
    });

    it("정상 지급 시 getPromotionKey, executePromotion 순서로 호출하고 PointLog를 저장한다", async () => {
      const { em, fork } = buildEm(0);
      const tossApiClient = buildTossApiClient();
      const service = buildService({ em, tossApiClient });

      const result = await service.grantDrawingPromotionIfEligible(1234);

      expect(result).toBe(true);
      expect(tossApiClient.getPromotionKey).toHaveBeenCalledWith(1234);
      expect(tossApiClient.executePromotion).toHaveBeenCalledWith(
        1234,
        "test-key",
        "TEST_TEMP_PROMOTION_CODE",
        2,
      );
      expect(fork.persist).toHaveBeenCalledTimes(1);
    });

    it("4110 오류 시 재시도하여 성공한다", async () => {
      const { em } = buildEm(0);
      const tossApiClient = buildTossApiClient();
      tossApiClient.executePromotion
        .mockRejectedValueOnce(new TossPromotionError("4110", "내부 오류"))
        .mockResolvedValueOnce(undefined);
      const service = buildService({ em, tossApiClient });

      const result = await service.grantDrawingPromotionIfEligible(1234);

      expect(result).toBe(true);
      expect(tossApiClient.getPromotionKey).toHaveBeenCalledTimes(2);
    });

    it("TossTransportError 발생 시 재시도하여 성공한다", async () => {
      const { em } = buildEm(0);
      const tossApiClient = buildTossApiClient();
      tossApiClient.getPromotionKey
        .mockRejectedValueOnce(new TossTransportError("타임아웃"))
        .mockResolvedValueOnce("test-key");
      const service = buildService({ em, tossApiClient });

      const result = await service.grantDrawingPromotionIfEligible(1234);

      expect(result).toBe(true);
      expect(tossApiClient.getPromotionKey).toHaveBeenCalledTimes(2);
    });

    it("최대 재시도 모두 실패하면 false를 반환한다", async () => {
      const { em } = buildEm(0);
      const tossApiClient = buildTossApiClient();
      tossApiClient.executePromotion.mockRejectedValue(
        new TossPromotionError("4110", "내부 오류"),
      );
      const service = buildService({ em, tossApiClient });

      const result = await service.grantDrawingPromotionIfEligible(1234);

      expect(result).toBe(false);
      expect(tossApiClient.executePromotion).toHaveBeenCalledTimes(3);
    });

    it("재시도 불필요한 에러는 즉시 false를 반환한다", async () => {
      const { em } = buildEm(0);
      const tossApiClient = buildTossApiClient();
      tossApiClient.getPromotionKey.mockRejectedValue(
        new TossPromotionError("4109", "프로모션이 실행중이 아니에요"),
      );
      const service = buildService({ em, tossApiClient });

      const result = await service.grantDrawingPromotionIfEligible(1234);

      expect(result).toBe(false);
      expect(tossApiClient.getPromotionKey).toHaveBeenCalledTimes(1);
    });
  });
});
