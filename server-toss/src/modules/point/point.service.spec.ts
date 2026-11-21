import { describe, expect, it, jest } from "@jest/globals";
import {
  ExternalPromotionError,
  ExternalTransportError,
} from "src/common/errors/external.errors";
import { PointGrantStatus } from "./entity/point-grant-request.entity";
import { PointReason } from "./entity/point-log.entity";
import { PROMOTION_AMOUNT, PURGE_BATCH_SIZE } from "./point.contants";
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
    find: jest.fn().mockResolvedValue([] as unknown[]),
    nativeDelete: jest.fn().mockResolvedValue(0 as number),
  };
};

const buildPointGrantRequestRepository = () => ({
  findEligibleGrantsWithLock: jest
    .fn<() => Promise<unknown[]>>()
    .mockResolvedValue([]),
});

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

describe("포인트 서비스", () => {
  describe("포인트 지급 일괄 처리", () => {
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

  describe("처리된 지급 요청 정리", () => {
    it("실패 요청을 보존하고 보관 기간이 지난 성공 요청만 배치로 삭제한다", async () => {
      const em = buildEntityManager();
      const succeededIds = [1n, 2n];
      const failedIds = [3n];
      em.find.mockImplementation((_entity, where) => {
        const { status } = where as { status: PointGrantStatus };
        const ids =
          status === PointGrantStatus.SUCCEEDED ? succeededIds : failedIds;
        return Promise.resolve(ids.map((id) => ({ id })));
      });
      em.nativeDelete.mockResolvedValueOnce(succeededIds.length);
      const service = buildService({ entityManager: em });

      const result = await service.purgeProcessedGrantRequests();

      expect(result).toEqual({ succeededDeleted: 2 });
      expect(em.find).toHaveBeenCalledTimes(1);
      expect(em.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: PointGrantStatus.SUCCEEDED }),
        expect.objectContaining({ limit: PURGE_BATCH_SIZE }),
      );
      expect(em.nativeDelete).toHaveBeenCalledTimes(1);
      expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
        id: { $in: succeededIds },
      });
    });
  });

  describe("단건 포인트 지급", () => {
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

  describe("지급 성공 기록", () => {
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

  describe("지급 오류 처리", () => {
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
      it("재시도 처리한다", async () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });
        const request = buildRequest();

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

  describe("지급 대상 요청 선점", () => {
    describe("대상 요청을 선점하는 경우", () => {
      it("각 요청을 processing 상태로 바꾸고 flush한다", async () => {
        const em = buildEntityManager();
        const repository = buildPointGrantRequestRepository();
        const request1 = { processing: jest.fn() };
        const request2 = { processing: jest.fn() };
        repository.findEligibleGrantsWithLock.mockResolvedValue([
          request1,
          request2,
        ]);
        const service = buildService({
          entityManager: em,
          pointGrantRequestRepository: repository,
        });

        const result = await service.lockAndFetchEligibleGrants();

        expect(request1.processing).toHaveBeenCalledTimes(1);
        expect(request2.processing).toHaveBeenCalledTimes(1);
        expect(em.flush).toHaveBeenCalledTimes(1);
        expect(result).toEqual([request1, request2]);
      });
    });
  });

  describe("포인트 지급 요청 등록", () => {
    describe("지급 금액을 명시한 경우", () => {
      it("전달한 pointAmount로 요청을 생성한다", () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });

        service.enqueueGrant(1234, PointReason.MISSION, 7);

        expect(em.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            reason: PointReason.MISSION,
            pointAmount: 7,
          }),
        );
      });
    });

    describe("지급 금액을 생략한 경우", () => {
      it("PROMOTION_AMOUNT로 폴백한다", () => {
        const em = buildEntityManager();
        const service = buildService({ entityManager: em });

        service.enqueueGrant(1234, PointReason.MISSION);

        expect(em.create).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ pointAmount: PROMOTION_AMOUNT }),
        );
      });
    });
  });
});
