import { describe, expect, it, jest } from "@jest/globals";
import {
  ExternalPromotionError,
  ExternalTransportError,
} from "src/common/errors/external.errors";
import { PointGrantStatus } from "./entity/point-grant-request.entity";
import { PointReason } from "./entity/point-log.entity";
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

const buildEntityManager = (countResult: number | number[] = 0) => {
  const queue = Array.isArray(countResult) ? [...countResult] : null;

  return {
    count: jest.fn(async () => {
      if (queue) return queue.length > 0 ? (queue.shift() as number) : 0;
      return countResult;
    }),
    create: jest.fn((_entity, data) => data),
    persist: jest.fn(),
    flush: jest.fn(async () => undefined),
    getReference: jest.fn(),
  };
};

const buildPointGrantRequestRepository = () => {
  const flush = jest.fn(async () => undefined);
  return {
    getReference: jest.fn(),
    create: jest.fn(),
    findEligibleGrantsWithLock: jest.fn(async () => []),
    purgeByStatusBefore: jest.fn(async () => 0),
    getEntityManager: jest.fn(() => ({ flush })),
    __flush: flush,
  };
};

const buildPointGrantKeyIssuer = () => ({
  getPromotionKey: jest.fn(async () => "promotion-key"),
});
const buildPointGrantExectuer = () => ({
  executePromotion: jest.fn(async () => undefined),
});

const buildUser = (userKey = 1234) =>
  ({ userKey, name: "테스트유저" }) as never;

const buildRequest = ({
  id = BigInt(1),
  userKey = 1234,
  reason = PointReason.DRAWING,
  pointIdempotencyKey,
  pointAmount = 2,
}: {
  id?: bigint;
  userKey?: number;
  reason?: PointReason;
  pointIdempotencyKey?: string;
  pointAmount?: number;
} = {}) => ({
  id,
  user: buildUser(userKey),
  reason,
  pointAmount,
  pointIdempotencyKey,
  failed: jest.fn(),
  retry: jest.fn(),
  succeeded: jest.fn(),
  setPointIdempotencyKey: jest.fn(),
});

const buildService = ({
  entityManager = buildEntityManager(),
  pointGrantRequestRepository = buildPointGrantRequestRepository(),
  pointGrantExectuer = buildPointGrantExectuer(),
  pointKeyIssuer = buildPointGrantKeyIssuer(),
}: {
  entityManager?: ReturnType<typeof buildEntityManager>;
  pointGrantRequestRepository?: ReturnType<
    typeof buildPointGrantRequestRepository
  >;
  pointGrantExectuer?: ReturnType<typeof buildPointGrantExectuer>;
  pointKeyIssuer?: ReturnType<typeof buildPointGrantKeyIssuer>;
} = {}) =>
  new PointService(
    pointGrantRequestRepository as never,
    entityManager as never,
    pointKeyIssuer as never,
    pointGrantExectuer as never,
  );

describe("PointService", () => {
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
    describe("PROCEED 결정이고 외부 지급이 성공한 경우", () => {
      it("성공 처리 메서드를 호출한다", async () => {
        const service = buildService();
        const request = buildRequest();

        jest.spyOn(service, "grantPromotion").mockResolvedValue();
        const succeededSpy = jest
          .spyOn(service, "recordGrantSucceeded")
          .mockResolvedValue(undefined);
        const failedSpy = jest
          .spyOn(service, "recordGrantOutcomeFromError")
          .mockResolvedValue(undefined);

        await service.settleGrantRequest(request as never);

        expect(succeededSpy).toHaveBeenCalledTimes(1);
        expect(failedSpy).not.toHaveBeenCalled();
      });
    });

    describe("PROCEED 결정이고 외부 지급이 실패한 경우", () => {
      it("실패/재시도 처리 메서드를 호출한다", async () => {
        const service = buildService();
        const request = buildRequest();
        const error = new Error("external failed");

        jest.spyOn(service, "grantPromotion").mockRejectedValue(error);
        const succeededSpy = jest
          .spyOn(service, "recordGrantSucceeded")
          .mockResolvedValue(undefined);
        const failedSpy = jest
          .spyOn(service, "recordGrantOutcomeFromError")
          .mockResolvedValue(undefined);

        await service.settleGrantRequest(request as never);

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
        const request = buildRequest();
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

  describe("recordGrantOutcomeFromError", () => {
    describe("ExternalPromotionError 4113이 발생한 경우", () => {
      it("지급 성공으로 처리한다", async () => {
        const service = buildService();
        const request = buildRequest();
        const succeededSpy = jest
          .spyOn(service, "recordGrantSucceeded")
          .mockResolvedValue(undefined);

        await service.recordGrantOutcomeFromError(
          request as never,
          new ExternalPromotionError("4113", "이미 지급됨"),
        );

        expect(succeededSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe("ExternalTransportError가 발생한 경우", () => {
      it("retry를 호출한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = buildRequest();

        await service.recordGrantOutcomeFromError(
          request as never,
          new ExternalTransportError("timeout"),
        );

        expect(request.retry).toHaveBeenCalledTimes(1);
        expect(request.failed).not.toHaveBeenCalled();
        expect(em.flush).toHaveBeenCalledTimes(1);
      });
    });

    describe("재시도 가능한 ExternalPromotionError(4110)가 발생한 경우", () => {
      it("retry를 호출한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = buildRequest();

        await service.recordGrantOutcomeFromError(
          request as never,
          new ExternalPromotionError("4110", "internal"),
        );

        expect(request.retry).toHaveBeenCalledTimes(1);
        expect(request.failed).not.toHaveBeenCalled();
        expect(em.flush).toHaveBeenCalledTimes(1);
      });
    });

    describe("재시도 불가능한 ExternalPromotionError가 발생한 경우", () => {
      it("failed를 호출한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = buildRequest();

        await service.recordGrantOutcomeFromError(
          request as never,
          new ExternalPromotionError("4109", "promotion ended"),
        );

        expect(request.retry).not.toHaveBeenCalled();
        expect(request.failed).toHaveBeenCalledTimes(1);
        expect(em.flush).toHaveBeenCalledTimes(1);
      });
    });

    describe("DB 에러가 발생한 경우", () => {
      it("성공 처리한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = buildRequest();

        await service.recordGrantOutcomeFromError(
          request as never,
          new Error("unknown"),
        );

        expect(request.succeeded).toHaveBeenCalledTimes(1);
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
});
