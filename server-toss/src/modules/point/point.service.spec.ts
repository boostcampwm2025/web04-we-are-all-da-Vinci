import { describe, expect, it, jest } from "@jest/globals";
import {
  TossPromotionError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import { PointGrantStatus } from "./point-grant-request.entity";
import { PointReason } from "./point-log.entity";
import { PointService } from "./point.service";

const FIXED_NOW = new Date("2026-05-25T00:00:00.000Z");
const FIXED_DAY_RANGE = {
  start: new Date("2026-05-24T15:00:00.000Z"),
  end: new Date("2026-05-25T15:00:00.000Z"),
};

jest.mock("src/common/util/time.util", () => ({
  getSeoulDateTime: jest.fn(() => FIXED_NOW),
  getSeoulDayRange: jest.fn(() => FIXED_DAY_RANGE),
}));

const buildEntityManager = (countResult = 0) => ({
  count: jest.fn(async () => countResult),
  create: jest.fn((_entity, data) => data),
  persist: jest.fn(),
  flush: jest.fn(async () => undefined),
});

const buildPointGrantRequestRepository = () => {
  const flush = jest.fn(async () => undefined);
  return {
    create: jest.fn(),
    findEligibleGrantsWithLock: jest.fn(async () => []),
    purgeByStatusBefore: jest.fn(async () => 0),
    getEntityManager: jest.fn(() => ({ flush })),
    __flush: flush,
  };
};

const buildTossApiClient = () => ({
  getPromotionKey: jest.fn(async () => "promotion-key"),
  executePromotion: jest.fn(async () => undefined),
});

const buildConfigService = (nodeEnv = "test", promotionCode = "PROMOTION") => ({
  get: jest.fn((key: string) => (key === "NODE_ENV" ? nodeEnv : undefined)),
  getOrThrow: jest.fn((key: string) => {
    if (key === "PROMOTION_CODE") return promotionCode;
    throw new Error(`Missing config: ${key}`);
  }),
});

const buildUser = (userKey = 1234) =>
  ({ userKey, name: "테스트유저" }) as never;

const buildService = ({
  entityManager = buildEntityManager(),
  pointGrantRequestRepository = buildPointGrantRequestRepository(),
  tossApiClient = buildTossApiClient(),
  configService = buildConfigService(),
}: {
  entityManager?: ReturnType<typeof buildEntityManager>;
  pointGrantRequestRepository?: ReturnType<
    typeof buildPointGrantRequestRepository
  >;
  tossApiClient?: ReturnType<typeof buildTossApiClient>;
  configService?: ReturnType<typeof buildConfigService>;
} = {}) =>
  new PointService(
    pointGrantRequestRepository as never,
    entityManager as never,
    tossApiClient as never,
    configService as never,
  );

describe("PointService", () => {
  describe("canGrantTodayPromotion", () => {
    describe("오늘 지급 횟수가 2회 미만인 경우", () => {
      it("true를 반환한다", async () => {
        const em = buildEntityManager(1);
        const service = buildService({ entityManager: em });

        await expect(service.canGrantTodayPromotion(1234)).resolves.toBe(true);
      });
    });

    describe("오늘 지급 횟수가 2회 이상인 경우", () => {
      it("false를 반환한다", async () => {
        const em = buildEntityManager(2);
        const service = buildService({ entityManager: em });

        await expect(service.canGrantTodayPromotion(1234)).resolves.toBe(false);
      });
    });
  });

  describe("savePointGrantRequest", () => {
    describe("오늘 프로모션 지급이 가능한 경우", () => {
      it("PENDING 요청을 생성하고 true를 반환한다", async () => {
        const repository = buildPointGrantRequestRepository();
        const service = buildService({
          pointGrantRequestRepository: repository,
        });
        jest.spyOn(service, "canGrantTodayPromotion").mockResolvedValue(true);

        const user = buildUser(1234);
        const result = await service.savePointGrantRequest(
          user,
          PointReason.DRAWING,
        );

        expect(result).toBe(true);
        expect(repository.create).toHaveBeenCalledTimes(1);
        expect(repository.__flush).toHaveBeenCalledTimes(1);
      });
    });

    describe("오늘 프로모션 지급이 불가능한 경우", () => {
      it("요청을 생성하지 않고 false를 반환한다", async () => {
        const repository = buildPointGrantRequestRepository();
        const service = buildService({
          pointGrantRequestRepository: repository,
        });
        jest.spyOn(service, "canGrantTodayPromotion").mockResolvedValue(false);

        const result = await service.savePointGrantRequest(
          buildUser(1234),
          PointReason.DRAWING,
        );

        expect(result).toBe(false);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.__flush).not.toHaveBeenCalled();
      });
    });
  });

  describe("settleGrantRequests", () => {
    describe("처리 가능한 요청이 여러 개 있는 경우", () => {
      it("요청마다 settleGrantRequest를 순차 호출한다", async () => {
        const service = buildService();
        const req1 = {} as never;
        const req2 = {} as never;
        jest
          .spyOn(service, "lockAndFetchEligibleGrants")
          .mockResolvedValue([req1, req2]);
        const settleSpy = jest
          .spyOn(service, "settleGrantRequest")
          .mockResolvedValue(undefined);

        await service.settleGrantRequests();

        expect(settleSpy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("purgeProcessedGrantRequests", () => {
    describe("purge를 실행하는 경우", () => {
      it("SUCCEEDED/FAILED를 각각 100건 배치로 정리한다", async () => {
        const repository = buildPointGrantRequestRepository();
        repository.purgeByStatusBefore
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(20);
        const service = buildService({
          pointGrantRequestRepository: repository,
        });

        const result = await service.purgeProcessedGrantRequests();

        expect(result).toEqual({ succeededDeleted: 10, failedDeleted: 20 });
        expect(repository.purgeByStatusBefore).toHaveBeenCalledTimes(2);
        expect(repository.purgeByStatusBefore).toHaveBeenNthCalledWith(
          1,
          PointGrantStatus.SUCCEEDED,
          new Date("2026-05-18T00:00:00.000Z"),
          100,
        );
        expect(repository.purgeByStatusBefore).toHaveBeenNthCalledWith(
          2,
          PointGrantStatus.FAILED,
          new Date("2026-04-25T00:00:00.000Z"),
          100,
        );
      });
    });
  });

  describe("settleGrantRequest", () => {
    describe("외부 지급 호출이 성공한 경우", () => {
      it("성공 처리 메서드를 호출한다", async () => {
        const service = buildService();
        const request = {} as never;
        jest.spyOn(service, "grantDrawingPromotion").mockResolvedValue();
        const succeededSpy = jest
          .spyOn(service, "recordGrantSucceeded")
          .mockResolvedValue(undefined);
        const failedSpy = jest
          .spyOn(service, "recordGrantFailedOrRetry")
          .mockResolvedValue(undefined);

        await service.settleGrantRequest(request);

        expect(succeededSpy).toHaveBeenCalledTimes(1);
        expect(failedSpy).not.toHaveBeenCalled();
      });
    });

    describe("외부 지급 호출이 실패한 경우", () => {
      it("실패/재시도 처리 메서드를 호출한다", async () => {
        const service = buildService();
        const request = {} as never;
        const error = new Error("external failed");
        jest.spyOn(service, "grantDrawingPromotion").mockRejectedValue(error);
        const succeededSpy = jest
          .spyOn(service, "recordGrantSucceeded")
          .mockResolvedValue(undefined);
        const failedSpy = jest
          .spyOn(service, "recordGrantOutcomeFromError")
          .mockResolvedValue(undefined);

        await service.settleGrantRequest(request);

        expect(succeededSpy).not.toHaveBeenCalled();
        expect(failedSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("recordGrantSucceeded", () => {
    describe("지급 성공 상태를 반영하는 경우", () => {
      it("request.succeeded 후 PointLog를 persist한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = {
          succeeded: jest.fn(),
          user: buildUser(1234),
          reason: PointReason.DRAWING,
          pointAmount: 2,
        };
        const createdLog = { id: 1 };
        em.create.mockReturnValue(createdLog);

        await service.recordGrantSucceeded(request as never);

        expect(request.succeeded).toHaveBeenCalledTimes(1);
        expect(em.create).toHaveBeenCalledTimes(1);
        expect(em.persist).toHaveBeenCalledTimes(1);
        expect(em.flush).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("recordGrantFailedOrRetry", () => {
    describe("TossTransportError가 발생한 경우", () => {
      it("retry를 호출한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = { retry: jest.fn(), failed: jest.fn() };

        await service.recordGrantOutcomeFromError(
          request as never,
          new TossTransportError("timeout"),
        );

        expect(request.retry).toHaveBeenCalledTimes(1);
        expect(request.failed).not.toHaveBeenCalled();
        expect(em.flush).toHaveBeenCalledTimes(1);
      });
    });

    describe("재시도 가능한 TossPromotionError(4110)가 발생한 경우", () => {
      it("retry를 호출한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = { retry: jest.fn(), failed: jest.fn() };

        await service.recordGrantOutcomeFromError(
          request as never,
          new TossPromotionError("4110", "internal"),
        );

        expect(request.retry).toHaveBeenCalledTimes(1);
        expect(request.failed).not.toHaveBeenCalled();
        expect(em.flush).toHaveBeenCalledTimes(1);
      });
    });

    describe("재시도 불가능한 TossPromotionError가 발생한 경우", () => {
      it("failed를 호출한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = { retry: jest.fn(), failed: jest.fn() };

        await service.recordGrantOutcomeFromError(
          request as never,
          new TossPromotionError("4109", "promotion ended"),
        );

        expect(request.retry).not.toHaveBeenCalled();
        expect(request.failed).toHaveBeenCalledTimes(1);
        expect(em.flush).toHaveBeenCalledTimes(1);
      });
    });

    describe("알 수 없는 에러가 발생한 경우", () => {
      it("retry를 호출한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = { retry: jest.fn(), failed: jest.fn() };

        await service.recordGrantOutcomeFromError(
          request as never,
          new Error("unknown"),
        );

        expect(request.retry).toHaveBeenCalledTimes(1);
        expect(request.failed).not.toHaveBeenCalled();
        expect(em.flush).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("lockAndFetchEligibleGrants", () => {
    describe("대상 요청을 선점하는 경우", () => {
      it("각 요청을 processing 상태로 바꾸고 flush한다", async () => {
        const repository = buildPointGrantRequestRepository();
        const request1 = { processing: jest.fn() };
        const request2 = { processing: jest.fn() };
        repository.findEligibleGrantsWithLock.mockResolvedValue([
          request1,
          request2,
        ]);
        const service = buildService({
          pointGrantRequestRepository: repository,
        });

        const result = await service.lockAndFetchEligibleGrants();

        expect(request1.processing).toHaveBeenCalledTimes(1);
        expect(request2.processing).toHaveBeenCalledTimes(1);
        expect(repository.__flush).toHaveBeenCalledTimes(1);
        expect(result).toEqual([request1, request2]);
      });
    });
  });

  describe("grantDrawingPromotion", () => {
    describe("개발 환경에서 지급 API를 호출하는 경우", () => {
      it("TEST_ prefix가 적용된 promotionCode로 지급 호출한다", async () => {
        const tossApiClient = buildTossApiClient();
        const service = buildService({ tossApiClient });
        const request = {
          user: { userKey: 1234 },
          pointAmount: 2,
        };

        await service.grantDrawingPromotion(request as never);

        expect(tossApiClient.getPromotionKey).toHaveBeenCalledWith(1234);
        expect(tossApiClient.executePromotion).toHaveBeenCalledWith(
          1234,
          "promotion-key",
          "TEST_PROMOTION",
          2,
        );
      });
    });

    describe("운영 환경에서 지급 API를 호출하는 경우", () => {
      it("원본 promotionCode로 지급 호출한다", async () => {
        const tossApiClient = buildTossApiClient();
        const configService = buildConfigService("production", "PROMOTION");
        const service = buildService({ tossApiClient, configService });
        const request = {
          user: { userKey: 4321 },
          pointAmount: 2,
        };

        await service.grantDrawingPromotion(request as never);

        expect(tossApiClient.executePromotion).toHaveBeenCalledWith(
          4321,
          "promotion-key",
          "PROMOTION",
          2,
        );
      });
    });
  });
});
