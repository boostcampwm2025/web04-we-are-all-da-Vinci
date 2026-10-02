import { describe, expect, it, jest } from "@jest/globals";
import { Logger } from "@nestjs/common";
import {
  ExternalApiError,
  ExternalPromotionError,
  ExternalTransportError,
} from "src/common/errors/external.errors";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./entity/point-grant-request.entity";
import { PointLog, PointReason } from "./entity/point-log.entity";
import { User } from "../user/user.entity";
import { PROMOTION_AMOUNT, PURGE_BATCH_SIZE } from "./point.contants";
import { PointService } from "./point.service";
import { PointGrantRequestRepository } from "./point-grant-request.repository";
import type { PointGrantExecuter } from "./port/point-grant-executer.interface";
import type { PointGrantKeyIssuer } from "./port/point-grant-key-issuer.interface";

const FIXED_NOW = new Date("2026-05-25T00:00:00.000Z");
const FIXED_DAY_RANGE = {
  start: new Date("2026-05-24T15:00:00.000Z"),
  end: new Date("2026-05-25T15:00:00.000Z"),
};

jest.mock("src/common/util/time.util", () => ({
  getSeoulDateTime: jest.fn(() => FIXED_NOW),
  getSeoulDayRange: jest.fn(() => FIXED_DAY_RANGE),
}));

const buildEntityManager = () => ({
  // DB 경계만 대체한다. 트랜잭션 데코레이터는 전역 테스트 설정에서 비활성화된다.
  create: jest.fn((entity: new () => object, data: Record<string, unknown>) =>
    Object.assign(new entity(), data),
  ),
  persist: jest.fn(),
  flush: jest.fn<() => Promise<void>>().mockResolvedValue(),
  getReference: jest.fn((_entity: unknown, userKey: number) => ({ userKey })),
  find: jest
    .fn<(...args: unknown[]) => Promise<Array<{ id: bigint }>>>()
    .mockResolvedValue([]),
  nativeDelete: jest
    .fn<(...args: unknown[]) => Promise<number>>()
    .mockResolvedValue(0),
});

const createRequest = (overrides: Partial<PointGrantRequest> = {}) =>
  Object.assign(new PointGrantRequest(), {
    id: 1n,
    user: Object.assign(new User(), { userKey: 1234, name: "테스트유저" }),
    reason: PointReason.DRAWING,
    pointAmount: 2,
    status: PointGrantStatus.PROCESSING,
    attemptCount: 0,
    maxAttemptCount: 5,
    createdAt: FIXED_NOW,
    lockedAt: FIXED_NOW,
    ...overrides,
  });

const setup = () => {
  const em = buildEntityManager();
  const repository = Object.assign(
    new PointGrantRequestRepository({} as never, PointGrantRequest),
    {
      findEligibleGrantsWithLock: jest
        .fn<() => Promise<PointGrantRequest[]>>()
        .mockResolvedValue([]),
      count: jest
        .fn<(where: unknown) => Promise<number>>()
        .mockResolvedValue(0),
      nativeUpdate: jest
        .fn<
          (where: unknown, data: Record<string, unknown>) => Promise<number>
        >()
        .mockResolvedValue(0),
    },
  );
  const keyIssuer = {
    getPromotionKey: jest
      .fn<PointGrantKeyIssuer["getPromotionKey"]>()
      .mockResolvedValue("promotion-key"),
  };
  const executor = {
    executePromotion: jest
      .fn<PointGrantExecuter["executePromotion"]>()
      .mockResolvedValue(undefined),
    getPromotionResult: jest
      .fn<PointGrantExecuter["getPromotionResult"]>()
      .mockResolvedValue({ type: "SUCCESS" }),
  };
  const service = new PointService(
    repository as never,
    em as never,
    keyIssuer as never,
    executor as never,
  );

  return { service, em, repository, keyIssuer, executor };
};

describe("포인트 서비스", () => {
  describe("포인트 요약 조회", () => {
    it("SUSPENDED 요청도 누적 포인트에 포함하고 오늘 생성된 요청만 오늘 포인트에 포함한다", async () => {
      const { service, em } = setup();
      const requests = [
        createRequest({ status: PointGrantStatus.SUSPENDED, pointAmount: 2 }),
        createRequest({
          id: 2n,
          status: PointGrantStatus.SUSPENDED,
          pointAmount: 3,
          createdAt: new Date(FIXED_DAY_RANGE.start.getTime() - 1),
        }),
      ];
      em.find.mockImplementation((entity, where) => {
        if (entity !== PointGrantRequest) return Promise.resolve([]);

        // 조회 조건을 적용해야 SUSPENDED 누락을 단순 반환 mock이 숨기지 않는다.
        const filter = where as {
          user: number;
          status: { $in: PointGrantStatus[] };
        };
        return Promise.resolve(
          requests.filter(
            (request) =>
              request.user.userKey === filter.user &&
              filter.status.$in.includes(request.status),
          ),
        );
      });

      const summary = await service.getPointSummary(1234);

      expect(summary).toEqual({ totalPoints: 5, todayPoints: 2 });
    });
  });

  describe("중단된 지급 요청 복구", () => {
    it("SUSPENDED 요청만 PENDING으로 저장하고 키와 재시도 횟수를 보존한다", async () => {
      const { service, repository, executor, keyIssuer } = setup();
      const requests = [
        createRequest({
          status: PointGrantStatus.SUSPENDED,
          pointIdempotencyKey: "existing-key",
          attemptCount: 2,
        }),
        createRequest({ id: 2n, status: PointGrantStatus.PENDING }),
        createRequest({ id: 3n, status: PointGrantStatus.RETRY }),
        createRequest({ id: 4n, status: PointGrantStatus.PROCESSING }),
        createRequest({ id: 5n, status: PointGrantStatus.SUCCEEDED }),
        createRequest({ id: 6n, status: PointGrantStatus.FAILED }),
      ];
      const storedStatuses = new Map(
        requests.map((request) => [request.id, request.status]),
      );
      const matchesStatus = (
        request: PointGrantRequest,
        where: { status?: PointGrantStatus | { $in: PointGrantStatus[] } },
      ) =>
        !where.status ||
        (typeof where.status === "string"
          ? request.status === where.status
          : where.status.$in.includes(request.status));
      // Repository의 실제 복구 쿼리를 실행하고 count/nativeUpdate DB 경계만 대체한다.
      repository.count.mockImplementation(
        async (where) =>
          requests.filter((request) =>
            matchesStatus(
              request,
              where as Parameters<typeof matchesStatus>[1],
            ),
          ).length,
      );
      repository.nativeUpdate.mockImplementation(async (where, data) => {
        const targets = requests.filter((request) =>
          matchesStatus(request, where as Parameters<typeof matchesStatus>[1]),
        );
        targets.forEach((request) => {
          Object.assign(request, data);
          storedStatuses.set(request.id, request.status);
        });
        return targets.length;
      });

      await service.recoverSuspended();

      expect([...storedStatuses.values()]).toEqual([
        PointGrantStatus.PENDING,
        PointGrantStatus.PENDING,
        PointGrantStatus.RETRY,
        PointGrantStatus.PROCESSING,
        PointGrantStatus.SUCCEEDED,
        PointGrantStatus.FAILED,
      ]);
      expect(requests[0].pointIdempotencyKey).toBe("existing-key");
      expect(requests[0].attemptCount).toBe(2);
      expect(keyIssuer.getPromotionKey).not.toHaveBeenCalled();
      expect(executor.executePromotion).not.toHaveBeenCalled();
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
    });
  });

  describe("지급 요청 일괄 처리", () => {
    it("선점한 요청을 순서대로 처리하고 중단 여부를 반환한다", async () => {
      const { service, repository, executor } = setup();
      const requests = [
        createRequest({ id: 1n }),
        createRequest({
          id: 2n,
          user: Object.assign(new User(), { userKey: 5678 }),
        }),
      ];
      repository.findEligibleGrantsWithLock.mockResolvedValue(requests);

      const result = await service.settleGrantRequests();

      expect(executor.executePromotion).toHaveBeenNthCalledWith(
        1,
        1234,
        "promotion-key",
        2,
      );
      expect(executor.executePromotion).toHaveBeenNthCalledWith(
        2,
        5678,
        "promotion-key",
        2,
      );
      expect(requests.map(({ status }) => status)).toEqual([
        PointGrantStatus.SUCCEEDED,
        PointGrantStatus.SUCCEEDED,
      ]);
      expect(result).toEqual(false);
    });

    it("프로모션 종료 오류가 발생하면 요청을 격리하고 현재 배치의 나머지 지급을 중단한다", async () => {
      const { service, repository, executor, keyIssuer, em } = setup();
      const request = createRequest({
        id: 1n,
        status: PointGrantStatus.PENDING,
        attemptCount: 2,
      });
      const nextRequest = createRequest({
        id: 2n,
        status: PointGrantStatus.PENDING,
        user: Object.assign(new User(), { userKey: 5678 }),
      });
      repository.findEligibleGrantsWithLock.mockResolvedValue([
        request,
        nextRequest,
      ]);
      executor.executePromotion.mockRejectedValueOnce(
        new ExternalPromotionError("4105", "promotion ended"),
      );

      // 중단 신호를 반환하든 전파하든 이후 요청의 외부 지급은 실행하지 않아야 한다.
      await Promise.allSettled([service.settleGrantRequests()]);

      expect(request.status).toBe(PointGrantStatus.SUSPENDED);
      expect(request.pointIdempotencyKey).toBe("promotion-key");
      expect(request.attemptCount).toBe(2);
      expect(executor.executePromotion).toHaveBeenCalledTimes(1);
      expect(executor.executePromotion).toHaveBeenCalledWith(
        1234,
        "promotion-key",
        2,
      );
      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
      expect(keyIssuer.getPromotionKey).toHaveBeenCalledWith(1234);
      expect(nextRequest.pointIdempotencyKey).toBeUndefined();
      expect(nextRequest.attemptCount).toBe(0);
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(em.persist).not.toHaveBeenCalled();
    });

    it("SUSPENDED가 발생하면 미처리 선점 요청만 PENDING으로 반환하고 키와 재시도 횟수를 보존한다", async () => {
      const { service, repository, executor, keyIssuer, em } = setup();
      const completedRequest = createRequest({
        id: 1n,
        status: PointGrantStatus.PENDING,
      });
      const suspendedRequest = createRequest({
        id: 2n,
        status: PointGrantStatus.PENDING,
      });
      const remainingRequests = [
        createRequest({ id: 3n, status: PointGrantStatus.PENDING }),
        createRequest({
          id: 4n,
          status: PointGrantStatus.RETRY,
          pointIdempotencyKey: "existing-key",
          attemptCount: 2,
        }),
      ];
      const requests = [
        completedRequest,
        suspendedRequest,
        ...remainingRequests,
      ];
      const flushedStatuses: PointGrantStatus[][] = [];
      repository.findEligibleGrantsWithLock.mockResolvedValue(requests);
      em.flush.mockImplementation(async () => {
        flushedStatuses.push(requests.map(({ status }) => status));
      });
      executor.executePromotion
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(
          new ExternalPromotionError("4105", "promotion ended"),
        );

      await service.settleGrantRequests();

      expect(flushedStatuses[0]).toEqual([
        PointGrantStatus.PROCESSING,
        PointGrantStatus.PROCESSING,
        PointGrantStatus.PROCESSING,
        PointGrantStatus.PROCESSING,
      ]);
      expect(requests.map(({ status }) => status)).toEqual([
        PointGrantStatus.SUCCEEDED,
        PointGrantStatus.SUSPENDED,
        PointGrantStatus.PENDING,
        PointGrantStatus.PENDING,
      ]);
      // 메모리 변경뿐 아니라 반환 상태를 DB 경계로 전달했는지도 확인한다.
      expect(flushedStatuses).toContainEqual([
        PointGrantStatus.SUCCEEDED,
        PointGrantStatus.SUSPENDED,
        PointGrantStatus.PENDING,
        PointGrantStatus.PENDING,
      ]);
      expect(remainingRequests[0].pointIdempotencyKey).toBeUndefined();
      expect(remainingRequests[0].attemptCount).toBe(0);
      expect(remainingRequests[1].pointIdempotencyKey).toBe("existing-key");
      expect(remainingRequests[1].attemptCount).toBe(2);
      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
      expect(executor.executePromotion).toHaveBeenCalledTimes(2);
      expect(executor.getPromotionResult).toHaveBeenCalledTimes(1);
    });

    it("미처리 요청 반환 저장이 실패해도 오류를 기록하고 워커 중단 신호를 반환한다", async () => {
      const { service, repository, executor, keyIssuer, em } = setup();
      const request = createRequest({ status: PointGrantStatus.PENDING });
      const remainingRequest = createRequest({
        id: 2n,
        status: PointGrantStatus.RETRY,
        pointIdempotencyKey: "existing-key",
        attemptCount: 2,
      });
      const requests = [request, remainingRequest];
      const storedStatuses = new Map(
        requests.map(({ id, status }) => [id, status]),
      );
      const error = new Error("release save failed");
      repository.findEligibleGrantsWithLock.mockResolvedValue(requests);
      executor.executePromotion.mockRejectedValueOnce(
        new ExternalPromotionError("4105", "promotion ended"),
      );
      em.flush.mockImplementation(async () => {
        if (
          request.isSuspended() &&
          remainingRequest.status === PointGrantStatus.PENDING
        ) {
          throw error;
        }
        requests.forEach(({ id, status }) => storedStatuses.set(id, status));
      });
      const errorLog = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => undefined);

      try {
        await expect(service.settleGrantRequests()).resolves.toBe(true);

        // 메모리 객체는 변경됐어도 실패한 저장을 영속화 성공으로 판단하지 않는다.
        expect(storedStatuses.get(request.id)).toBe(PointGrantStatus.SUSPENDED);
        expect(storedStatuses.get(remainingRequest.id)).toBe(
          PointGrantStatus.PROCESSING,
        );
        expect(request.pointIdempotencyKey).toBe("promotion-key");
        expect(request.attemptCount).toBe(0);
        expect(remainingRequest.pointIdempotencyKey).toBe("existing-key");
        expect(remainingRequest.attemptCount).toBe(2);
        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
        expect(executor.getPromotionResult).not.toHaveBeenCalled();
        expect(em.persist).not.toHaveBeenCalled();
        expect(errorLog).toHaveBeenCalledWith(
          {
            event: "point_grant.release.failed",
            requestIds: [remainingRequest.id],
            err: error,
          },
          "미처리 포인트 지급 요청 반환 실패; 재시작 후 lease 복구 필요",
        );
      } finally {
        errorLog.mockRestore();
      }
    });

    it("기존 지급 결과가 PENDING이어도 현재 배치의 다음 요청은 지급한다", async () => {
      const { service, repository, executor, keyIssuer, em } = setup();
      const request = createRequest({
        id: 1n,
        status: PointGrantStatus.PENDING,
        pointIdempotencyKey: "existing-key",
      });
      const nextRequest = createRequest({
        id: 2n,
        status: PointGrantStatus.PENDING,
        user: Object.assign(new User(), { userKey: 5678 }),
      });
      repository.findEligibleGrantsWithLock.mockResolvedValue([
        request,
        nextRequest,
      ]);
      executor.getPromotionResult.mockResolvedValueOnce({ type: "PENDING" });

      await service.settleGrantRequests();

      expect(request.status).toBe(PointGrantStatus.RETRY);
      expect(request.pointIdempotencyKey).toBe("existing-key");
      expect(request.attemptCount).toBe(0);
      expect(executor.executePromotion).toHaveBeenCalledTimes(1);
      expect(executor.executePromotion).toHaveBeenCalledWith(
        5678,
        "promotion-key",
        2,
      );
      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
      expect(keyIssuer.getPromotionKey).toHaveBeenCalledWith(5678);
      expect(nextRequest.status).toBe(PointGrantStatus.SUCCEEDED);
      expect(em.persist).toHaveBeenCalledTimes(1);
      expect(em.persist).toHaveBeenCalledWith(expect.any(PointLog));
    });

    it.each([
      ["4095", new ExternalPromotionError("4095", "rate limit exceeded")],
      ["HTTP 429", new ExternalApiError(429, "too many requests")],
    ])(
      "요청 한도 초과(%s)는 해당 요청만 대기시키고 현재 배치의 다음 요청은 지급한다",
      async (_label, error) => {
        const { service, repository, executor, keyIssuer, em } = setup();
        const request = createRequest({
          id: 1n,
          status: PointGrantStatus.PENDING,
        });
        const nextRequest = createRequest({
          id: 2n,
          status: PointGrantStatus.PENDING,
          user: Object.assign(new User(), { userKey: 5678 }),
        });
        repository.findEligibleGrantsWithLock.mockResolvedValue([
          request,
          nextRequest,
        ]);
        executor.executePromotion.mockRejectedValueOnce(error);

        await service.settleGrantRequests();

        expect(request.status).toBe(PointGrantStatus.RETRY);
        expect(request.pointIdempotencyKey).toBe("promotion-key");
        expect(request.attemptCount).toBe(0);
        expect(executor.executePromotion).toHaveBeenCalledTimes(2);
        expect(executor.executePromotion).toHaveBeenNthCalledWith(
          1,
          1234,
          "promotion-key",
          2,
        );
        expect(executor.executePromotion).toHaveBeenNthCalledWith(
          2,
          5678,
          "promotion-key",
          2,
        );
        expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
        expect(keyIssuer.getPromotionKey).toHaveBeenNthCalledWith(1, 1234);
        expect(keyIssuer.getPromotionKey).toHaveBeenNthCalledWith(2, 5678);
        expect(nextRequest.status).toBe(PointGrantStatus.SUCCEEDED);
        expect(nextRequest.pointIdempotencyKey).toBe("promotion-key");
        expect(nextRequest.attemptCount).toBe(0);
        expect(executor.getPromotionResult).toHaveBeenCalledTimes(1);
        expect(executor.getPromotionResult).toHaveBeenCalledWith(
          5678,
          "promotion-key",
        );
        expect(em.persist).toHaveBeenCalledTimes(1);
        expect(em.persist).toHaveBeenCalledWith(expect.any(PointLog));
      },
    );

    describe("characterization: 현재 DB 오류 후처리", () => {
      it("현재 동작: 개별 요청의 DB 오류 이후에도 다음 요청 처리를 계속한다", async () => {
        const { service, repository, executor, em } = setup();
        const requests = [createRequest({ id: 1n }), createRequest({ id: 2n })];
        repository.findEligibleGrantsWithLock.mockResolvedValue(requests);
        executor.executePromotion.mockRejectedValueOnce(
          new ExternalTransportError("timeout"),
        );
        em.flush
          .mockResolvedValueOnce()
          .mockResolvedValueOnce()
          .mockRejectedValueOnce(new Error("retry save failed"));

        await service.settleGrantRequests();

        expect(executor.executePromotion).toHaveBeenCalledTimes(2);
        expect(requests[1].status).toBe(PointGrantStatus.SUCCEEDED);
      });
    });
  });

  describe("처리된 지급 요청 정리", () => {
    it("성공과 실패 요청을 각각 제한된 배치로 삭제한다", async () => {
      const { service, em } = setup();
      const succeededTargets = Array.from({ length: 10 }, (_, index) => ({
        id: BigInt(index + 1),
      }));
      const failedTargets = Array.from({ length: 20 }, (_, index) => ({
        id: BigInt(index + 100),
      }));
      em.find
        .mockResolvedValueOnce(succeededTargets)
        .mockResolvedValueOnce(failedTargets);
      em.nativeDelete.mockResolvedValueOnce(10).mockResolvedValueOnce(20);

      const result = await service.purgeProcessedGrantRequests();

      expect(em.find).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ status: PointGrantStatus.SUCCEEDED }),
        expect.objectContaining({ limit: PURGE_BATCH_SIZE }),
      );
      expect(em.find).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ status: PointGrantStatus.FAILED }),
        expect.objectContaining({ limit: PURGE_BATCH_SIZE }),
      );
      expect(em.nativeDelete).toHaveBeenNthCalledWith(1, expect.anything(), {
        id: { $in: succeededTargets.map(({ id }) => id) },
      });
      expect(em.nativeDelete).toHaveBeenNthCalledWith(2, expect.anything(), {
        id: { $in: failedTargets.map(({ id }) => id) },
      });
      expect(result).toEqual({ succeededDeleted: 10, failedDeleted: 20 });
    });
  });

  describe("단일 지급 요청 처리", () => {
    describe("기존 지급 키가 없는 요청", () => {
      it.each(["FAILED", "NOT_FOUND"] as const)(
        "신규 지급 결과 %s면 키를 제거하고 다음 워커에서 다시 지급한다",
        async (type) => {
          const { service, executor, keyIssuer, em } = setup();
          const request = createRequest();
          keyIssuer.getPromotionKey
            .mockResolvedValueOnce("first-key")
            .mockResolvedValueOnce("second-key");
          executor.getPromotionResult
            .mockResolvedValueOnce({ type })
            .mockResolvedValueOnce({ type: "SUCCESS" });

          await service.settleGrantRequest(request);

          expect(executor.executePromotion).toHaveBeenCalledTimes(1);
          expect(executor.executePromotion).toHaveBeenCalledWith(
            1234,
            "first-key",
            2,
          );
          expect(executor.getPromotionResult).toHaveBeenCalledWith(
            1234,
            "first-key",
          );
          expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
          expect(request.status).toBe(PointGrantStatus.RETRY);
          expect(request.pointIdempotencyKey).toBeUndefined();
          expect(request.attemptCount).toBe(1);
          expect(em.persist).not.toHaveBeenCalled();

          request.processing(); // 다음 워커에서 선점한 상태로 재진입한다.
          await service.settleGrantRequest(request);

          expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
          expect(executor.executePromotion).toHaveBeenCalledTimes(2);
          expect(executor.executePromotion).toHaveBeenLastCalledWith(
            1234,
            "second-key",
            2,
          );
          expect(executor.getPromotionResult).toHaveBeenLastCalledWith(
            1234,
            "second-key",
          );
          expect(request.status).toBe(PointGrantStatus.SUCCEEDED);
          expect(request.pointIdempotencyKey).toBe("second-key");
          expect(request.attemptCount).toBe(1);
          expect(em.persist).toHaveBeenCalledTimes(1);
          expect(em.persist).toHaveBeenCalledWith(expect.any(PointLog));
        },
      );

      it("키 발급에 실패하면 지급하지 않고 다음 워커에서 다시 발급한다", async () => {
        const { service, executor, keyIssuer, em } = setup();
        const request = createRequest();
        keyIssuer.getPromotionKey
          .mockRejectedValueOnce(new ExternalTransportError("key timeout"))
          .mockResolvedValueOnce("reissued-key");

        await service.settleGrantRequest(request);

        expect(request.status).toBe(PointGrantStatus.RETRY);
        expect(request.attemptCount).toBe(1);
        expect(request.pointIdempotencyKey).toBeUndefined();
        expect(request.nextRetryAt).toEqual(
          new Date(FIXED_NOW.getTime() + 5_000),
        );
        expect(executor.executePromotion).not.toHaveBeenCalled();
        expect(executor.getPromotionResult).not.toHaveBeenCalled();
        expect(em.persist).not.toHaveBeenCalled();

        request.processing(); // 다음 워커에서 선점한 상태로 진입한다.
        await service.settleGrantRequest(request);

        expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(executor.executePromotion).toHaveBeenCalledWith(
          1234,
          "reissued-key",
          2,
        );
        expect(request.status).toBe(PointGrantStatus.SUCCEEDED);
        expect(request.attemptCount).toBe(1);
      });

      it.each([
        ["timeout", new ExternalTransportError("timeout")],
        ["connection reset", new ExternalTransportError("connection reset")],
        ["4110", new ExternalPromotionError("4110", "internal")],
        ["4113", new ExternalPromotionError("4113", "이미 처리됨")],
        ["HTTP 500", new ExternalApiError(500, "internal")],
      ])(
        "지급 중 %s가 발생하면 키를 유지하고 재시도 횟수를 증가시킨다",
        async (_label, error) => {
          const { service, executor, em } = setup();
          const request = createRequest({ attemptCount: 1 });
          executor.executePromotion.mockRejectedValueOnce(error);

          await service.settleGrantRequest(request);

          expect(request.status).toBe(PointGrantStatus.RETRY);
          expect(request.attemptCount).toBe(2);
          expect(request.pointIdempotencyKey).toBe("promotion-key");
          expect(executor.executePromotion).toHaveBeenCalledTimes(1);
          expect(em.persist).not.toHaveBeenCalled();
        },
      );

      it("재시도 한도에 도달하면 키를 보존한 최종 실패가 된다", async () => {
        const { service, executor, em } = setup();
        const request = createRequest({ attemptCount: 4 });
        executor.executePromotion.mockRejectedValueOnce(
          new ExternalTransportError("timeout"),
        );

        await service.settleGrantRequest(request);

        expect(request.status).toBe(PointGrantStatus.FAILED);
        expect(request.attemptCount).toBe(5);
        expect(request.failedMessage).toBe("재시도 횟수 초과");
        expect(request.pointIdempotencyKey).toBe("promotion-key");
        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(em.persist).not.toHaveBeenCalled();
      });
    });

    describe("기존 지급 키가 있는 요청", () => {
      it.each(["FAILED", "NOT_FOUND"] as const)(
        "기존 결과가 %s이면 같은 실행에서 새 키로 한 번 지급한다",
        async (type) => {
          const { service, executor, keyIssuer, em } = setup();
          const request = createRequest({
            pointIdempotencyKey: "existing-key",
            attemptCount: 2,
          });
          executor.getPromotionResult
            .mockResolvedValueOnce({ type })
            .mockResolvedValueOnce({ type: "SUCCESS" });
          keyIssuer.getPromotionKey.mockResolvedValueOnce("new-key");

          await service.settleGrantRequest(request);

          expect(executor.getPromotionResult).toHaveBeenCalledTimes(2);
          expect(executor.getPromotionResult).toHaveBeenNthCalledWith(
            1,
            1234,
            "existing-key",
          );
          expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
          expect(keyIssuer.getPromotionKey).toHaveBeenCalledWith(1234);
          expect(executor.executePromotion).toHaveBeenCalledTimes(1);
          expect(executor.executePromotion).toHaveBeenCalledWith(
            1234,
            "new-key",
            2,
          );
          expect(executor.getPromotionResult).toHaveBeenNthCalledWith(
            2,
            1234,
            "new-key",
          );
          expect(
            executor.getPromotionResult.mock.invocationCallOrder[0],
          ).toBeLessThan(keyIssuer.getPromotionKey.mock.invocationCallOrder[0]);
          expect(
            executor.executePromotion.mock.invocationCallOrder[0],
          ).toBeLessThan(
            executor.getPromotionResult.mock.invocationCallOrder[1],
          );
          expect(request.status).toBe(PointGrantStatus.SUCCEEDED);
          expect(request.pointIdempotencyKey).toBe("new-key");
          expect(request.attemptCount).toBe(2);
          expect(em.persist).toHaveBeenCalledTimes(1);
          expect(em.persist).toHaveBeenCalledWith(expect.any(PointLog));
        },
      );

      it.each(["FAILED", "NOT_FOUND"] as const)(
        "기존 결과가 %s이면 새 키 발급 실패에도 기존 키를 제거하고 다음 워커에서 다시 조회하지 않는다",
        async (type) => {
          const { service, executor, keyIssuer, em } = setup();
          const request = createRequest({
            pointIdempotencyKey: "existing-key",
            attemptCount: 2,
          });
          let keyAtIssuance: string | undefined;
          executor.getPromotionResult
            .mockResolvedValueOnce({ type })
            .mockResolvedValue({ type: "SUCCESS" });
          keyIssuer.getPromotionKey
            .mockImplementationOnce(() => {
              keyAtIssuance = request.pointIdempotencyKey;
              return Promise.reject(new ExternalTransportError("key timeout"));
            })
            .mockResolvedValueOnce("new-key");

          await service.settleGrantRequest(request);

          expect(request.status).toBe(PointGrantStatus.RETRY);
          expect(request.attemptCount).toBe(3);
          expect(request.pointIdempotencyKey).toBeUndefined();
          expect(keyAtIssuance).toBeUndefined();
          expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
          expect(executor.getPromotionResult).toHaveBeenCalledTimes(1);
          expect(executor.getPromotionResult).toHaveBeenCalledWith(
            1234,
            "existing-key",
          );
          expect(executor.executePromotion).not.toHaveBeenCalled();
          expect(em.persist).not.toHaveBeenCalled();

          request.processing(); // 다음 워커에서는 무효화된 기존 키를 재조회하지 않는다.
          await service.settleGrantRequest(request);

          expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
          expect(executor.executePromotion).toHaveBeenCalledTimes(1);
          expect(executor.executePromotion).toHaveBeenCalledWith(
            1234,
            "new-key",
            2,
          );
          expect(executor.getPromotionResult).toHaveBeenCalledTimes(2);
          expect(executor.getPromotionResult).toHaveBeenNthCalledWith(
            2,
            1234,
            "new-key",
          );
          expect(request.status).toBe(PointGrantStatus.SUCCEEDED);
          expect(request.pointIdempotencyKey).toBe("new-key");
          expect(request.attemptCount).toBe(3);
          expect(em.persist).toHaveBeenCalledTimes(1);
          expect(em.persist).toHaveBeenCalledWith(expect.any(PointLog));
        },
      );

      it("기존 객체 SUCCESS면 키를 유지하고 새 지급 없이 성공 처리한다", async () => {
        const { service, executor, keyIssuer, em } = setup();
        const request = createRequest({
          pointIdempotencyKey: "existing-key",
          attemptCount: 2,
        });
        executor.getPromotionResult.mockResolvedValue({ type: "SUCCESS" });

        await service.settleGrantRequest(request);

        expect(request.status).toBe(PointGrantStatus.SUCCEEDED);
        expect(request.pointIdempotencyKey).toBe("existing-key");
        expect(keyIssuer.getPromotionKey).not.toHaveBeenCalled();
        expect(executor.executePromotion).not.toHaveBeenCalled();
        expect(em.persist).toHaveBeenCalledWith(expect.any(PointLog));
      });

      it("기존 객체 PENDING이면 키를 유지하고 attemptCount 증가 없이 대기한다", async () => {
        const { service, executor, keyIssuer } = setup();
        const request = createRequest({
          pointIdempotencyKey: "existing-key",
          attemptCount: 2,
        });
        executor.getPromotionResult.mockResolvedValue({ type: "PENDING" });

        await service.settleGrantRequest(request);

        expect(request.status).toBe(PointGrantStatus.RETRY);
        expect(request.pointIdempotencyKey).toBe("existing-key");
        expect(request.attemptCount).toBe(2);
        expect(executor.executePromotion).not.toHaveBeenCalled();
        expect(keyIssuer.getPromotionKey).not.toHaveBeenCalled();
      });

      it.each([
        ["transport", new ExternalTransportError("result timeout")],
        ["5xx", new ExternalApiError(500, "internal")],
      ])(
        "결과 조회 %s 오류면 키를 유지하고 RETRY하며 attemptCount를 증가시킨다",
        async (_label, error) => {
          const { service, executor, keyIssuer, em } = setup();
          const request = createRequest({
            pointIdempotencyKey: "existing-key",
            attemptCount: 2,
          });
          executor.getPromotionResult.mockRejectedValueOnce(error);

          await service.settleGrantRequest(request);

          expect(executor.getPromotionResult).toHaveBeenCalledWith(
            1234,
            "existing-key",
          );
          expect(request.status).toBe(PointGrantStatus.RETRY);
          expect(request.pointIdempotencyKey).toBe("existing-key");
          expect(request.attemptCount).toBe(3);
          expect(executor.executePromotion).not.toHaveBeenCalled();
          expect(keyIssuer.getPromotionKey).not.toHaveBeenCalled();
          expect(em.persist).not.toHaveBeenCalled();
        },
      );

      it("기존 지급 결과가 없으면 새 키로 지급한다", async () => {
        const { service, executor, keyIssuer, em } = setup();
        const request = createRequest({ pointIdempotencyKey: "existing-key" });
        executor.getPromotionResult.mockResolvedValueOnce(null);
        keyIssuer.getPromotionKey.mockResolvedValue("new-key");

        await service.settleGrantRequest(request);

        expect(executor.getPromotionResult).toHaveBeenCalledWith(
          1234,
          "existing-key",
        );
        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(executor.executePromotion).toHaveBeenCalledWith(
          1234,
          "new-key",
          2,
        );
        expect(request.pointIdempotencyKey).toBe("new-key");
        expect(request.status).toBe(PointGrantStatus.SUCCEEDED);
        expect(em.persist).toHaveBeenCalledTimes(1);
      });
    });

    describe("지급 안전 invariant", () => {
      // 외부 API 경계의 호출 순서/횟수만 고정한다. 오류별 count/WAIT 정책은 별도로 관찰한다.
      it("기존 키가 있으면 새 지급 전에 기존 결과를 먼저 확인한다", async () => {
        const { service, executor, keyIssuer } = setup();
        const request = createRequest({ pointIdempotencyKey: "existing-key" });
        executor.getPromotionResult.mockResolvedValueOnce(null);

        await service.settleGrantRequest(request);

        expect(executor.getPromotionResult).toHaveBeenCalledWith(
          1234,
          "existing-key",
        );
        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(
          executor.getPromotionResult.mock.invocationCallOrder[0],
        ).toBeLessThan(keyIssuer.getPromotionKey.mock.invocationCallOrder[0]);
        expect(
          executor.getPromotionResult.mock.invocationCallOrder[0],
        ).toBeLessThan(executor.executePromotion.mock.invocationCallOrder[0]);
      });

      it.each([
        ["transport", new ExternalTransportError("result timeout")],
        ["5xx", new ExternalApiError(500, "internal")],
      ])(
        "결과 조회가 %s로 불확실한 동안 다음 워커도 같은 키를 유지하며 지급하지 않는다",
        async (_label, error) => {
          const { service, executor, keyIssuer, em } = setup();
          const request = createRequest({
            pointIdempotencyKey: "existing-key",
          });
          executor.getPromotionResult.mockRejectedValue(error);

          await service.settleGrantRequest(request);

          expect(executor.getPromotionResult).toHaveBeenCalledWith(
            1234,
            "existing-key",
          );
          expect(request.pointIdempotencyKey).toBe("existing-key");
          expect(executor.executePromotion).not.toHaveBeenCalled();

          executor.getPromotionResult.mockClear();
          request.processing();
          await service.settleGrantRequest(request);

          expect(executor.getPromotionResult).toHaveBeenCalledWith(
            1234,
            "existing-key",
          );
          expect(request.pointIdempotencyKey).toBe("existing-key");
          expect(executor.executePromotion).not.toHaveBeenCalled();
          expect(keyIssuer.getPromotionKey).not.toHaveBeenCalled();
          expect(em.persist).not.toHaveBeenCalled();
        },
      );

      it.each([
        ["timeout", new ExternalTransportError("timeout")],
        ["4110", new ExternalPromotionError("4110", "internal")],
        ["4113", new ExternalPromotionError("4113", "이미 처리됨")],
      ])(
        "지급 %s 후 다음 워커는 기존 키를 조회하고 결과가 불확실하면 재지급하지 않는다",
        async (_label, error) => {
          const { service, executor, keyIssuer, em } = setup();
          const request = createRequest();
          executor.executePromotion.mockRejectedValueOnce(error);
          executor.getPromotionResult.mockRejectedValue(
            new ExternalTransportError("result timeout"),
          );

          await service.settleGrantRequest(request);

          expect(request.pointIdempotencyKey).toBe("promotion-key");
          expect(executor.executePromotion).toHaveBeenCalledTimes(1);
          expect(em.persist).not.toHaveBeenCalled();

          executor.getPromotionResult.mockClear();
          request.processing();
          await service.settleGrantRequest(request);

          expect(executor.getPromotionResult).toHaveBeenCalledWith(
            1234,
            "promotion-key",
          );
          expect(request.pointIdempotencyKey).toBe("promotion-key");
          expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
          expect(executor.executePromotion).toHaveBeenCalledTimes(1);
          expect(em.persist).not.toHaveBeenCalled();
        },
      );

      it("한 실행에서 신규 지급이 timeout이어도 새 지급은 최대 한 번이다", async () => {
        const { service, executor, keyIssuer, em } = setup();
        const request = createRequest();
        executor.executePromotion.mockRejectedValue(
          new ExternalTransportError("timeout"),
        );

        await service.settleGrantRequest(request);

        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
        expect(request.pointIdempotencyKey).toBe("promotion-key");
        expect(em.persist).not.toHaveBeenCalled();
      });

      it("기존 FAILED 확인 뒤 새 지급이 timeout이어도 한 실행에서 새 지급은 최대 한 번이다", async () => {
        const { service, executor, keyIssuer, em } = setup();
        const request = createRequest({ pointIdempotencyKey: "existing-key" });
        executor.getPromotionResult.mockResolvedValueOnce({ type: "FAILED" });
        executor.executePromotion.mockRejectedValue(
          new ExternalTransportError("new payment timeout"),
        );

        await service.settleGrantRequest(request);

        expect(executor.getPromotionResult).toHaveBeenCalledWith(
          1234,
          "existing-key",
        );
        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
        expect(request.pointIdempotencyKey).toBe("promotion-key");
        expect(em.persist).not.toHaveBeenCalled();
      });

      it("키를 DB에 저장하지 못하면 지급하지 않는다", async () => {
        const { service, executor, em } = setup();
        const request = createRequest();
        em.flush.mockRejectedValueOnce(new Error("key save failed"));

        // DB 오류를 전파하든 lease 복구에 맡기든 외부 지급이 발생하지 않아야 한다.
        await Promise.allSettled([service.settleGrantRequest(request)]);

        expect(executor.executePromotion).not.toHaveBeenCalled();
        expect(em.persist).not.toHaveBeenCalled();
      });
    });

    describe("기술적 예외 전파", () => {
      it("미분류 프로모션 오류는 키와 재시도 횟수를 유지하고 그대로 전파한다", async () => {
        const { service, executor, keyIssuer, em } = setup();
        const request = createRequest({
          pointIdempotencyKey: "existing-key",
          attemptCount: 2,
        });
        const error = new ExternalPromotionError(
          "UNKNOWN_CODE",
          "unclassified promotion error",
        );
        executor.getPromotionResult.mockRejectedValueOnce(error);

        await expect(service.settleGrantRequest(request)).rejects.toBe(error);

        expect(request.status).toBe(PointGrantStatus.PROCESSING);
        expect(request.pointIdempotencyKey).toBe("existing-key");
        expect(request.attemptCount).toBe(2);
        expect(keyIssuer.getPromotionKey).not.toHaveBeenCalled();
        expect(executor.executePromotion).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(em.persist).not.toHaveBeenCalled();
      });

      it("기존 결과 조회의 알 수 없는 예외는 요청을 RETRY로 변경하지 않고 그대로 전파한다", async () => {
        const { service, executor, keyIssuer, em } = setup();
        const request = createRequest({
          pointIdempotencyKey: "existing-key",
          attemptCount: 2,
        });
        const error = new TypeError("unexpected result error");
        executor.getPromotionResult.mockRejectedValueOnce(error);

        await expect(service.settleGrantRequest(request)).rejects.toBe(error);

        expect(request.status).toBe(PointGrantStatus.PROCESSING);
        expect(request.attemptCount).toBe(2);
        expect(request.pointIdempotencyKey).toBe("existing-key");
        expect(request.nextRetryAt).toBeUndefined();
        expect(keyIssuer.getPromotionKey).not.toHaveBeenCalled();
        expect(executor.executePromotion).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(em.persist).not.toHaveBeenCalled();
      });

      it("키 저장의 DB 예외는 재시도 상태를 추가 저장하지 않고 그대로 전파하며 지급하지 않는다", async () => {
        const { service, executor, em } = setup();
        const request = createRequest({ attemptCount: 2 });
        const error = new Error("key save failed");
        em.flush.mockRejectedValueOnce(error);

        await expect(service.settleGrantRequest(request)).rejects.toBe(error);

        // 실제 DB rollback과 영속화된 PROCESSING의 lease 복구는 DB 통합 테스트에서 검증한다.
        expect(request.status).toBe(PointGrantStatus.PROCESSING);
        expect(request.attemptCount).toBe(2);
        expect(request.nextRetryAt).toBeUndefined();
        expect(em.flush).toHaveBeenCalledTimes(1);
        expect(executor.executePromotion).not.toHaveBeenCalled();
        expect(executor.getPromotionResult).not.toHaveBeenCalled();
        expect(em.persist).not.toHaveBeenCalled();
      });
    });

    describe("운영 오류 처리", () => {
      it.each([
        ["4095", 0, new ExternalPromotionError("4095", "rate limit exceeded")],
        ["HTTP 429", 0, new ExternalApiError(429, "too many requests")],
        ["4095", 2, new ExternalPromotionError("4095", "rate limit exceeded")],
        ["HTTP 429", 2, new ExternalApiError(429, "too many requests")],
      ] as const)(
        "요청 한도 초과(%s, attemptCount=%i)는 키와 재시도 횟수를 보존하고 재처리 가능한 대기 상태로 남긴다",
        async (_label, attemptCount, error) => {
          const { service, executor, em } = setup();
          const request = createRequest({ attemptCount });
          executor.executePromotion.mockRejectedValueOnce(error);

          await service.settleGrantRequest(request);

          expect(request.status).toBe(PointGrantStatus.RETRY);
          expect(request.pointIdempotencyKey).toBe("promotion-key");
          expect(request.attemptCount).toBe(attemptCount);
          expect(request.nextRetryAt).toBeInstanceOf(Date);
          expect(request.nextRetryAt!.getTime()).toBeGreaterThan(
            FIXED_NOW.getTime(),
          );
          expect(request.processedAt).toBeUndefined();
          expect(executor.executePromotion).toHaveBeenCalledTimes(1);
          expect(executor.getPromotionResult).not.toHaveBeenCalled();
          expect(em.persist).not.toHaveBeenCalled();
        },
      );

      it("지급 요청의 데이터 구조 오류(HTTP 400)는 키와 재시도 횟수를 보존하고 SUSPENDED로 격리한다", async () => {
        const { service, executor, em } = setup();
        const request = createRequest({ attemptCount: 2 });
        executor.executePromotion.mockRejectedValueOnce(
          new ExternalApiError(400, "invalid request structure"),
        );

        // 워커 중단 신호의 전달 방식과 무관하게 요청은 재처리 가능하도록 보존한다.
        await Promise.allSettled([service.settleGrantRequest(request)]);

        expect(request.status).toBe(PointGrantStatus.SUSPENDED);
        expect(request.pointIdempotencyKey).toBe("promotion-key");
        expect(request.attemptCount).toBe(2);
        expect(request.nextRetryAt).toBeUndefined();
        expect(request.processedAt).toBeUndefined();
        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(executor.getPromotionResult).not.toHaveBeenCalled();
        expect(em.persist).not.toHaveBeenCalled();
      });

      it("프로모션이 종료되면 키와 재시도 횟수를 보존하고 SUSPENDED로 격리한다", async () => {
        const { service, executor, em } = setup();
        const request = createRequest({ attemptCount: 2 });
        executor.executePromotion.mockRejectedValueOnce(
          new ExternalPromotionError("4105", "promotion ended"),
        );

        // 워커 중단 신호의 전달 방식은 별도의 워커 정책 테스트에서 검증한다.
        await Promise.allSettled([service.settleGrantRequest(request)]);

        expect(request.status).toBe(PointGrantStatus.SUSPENDED);
        expect(request.pointIdempotencyKey).toBe("promotion-key");
        expect(request.attemptCount).toBe(2);
        expect(request.nextRetryAt).toBeUndefined();
        expect(request.processedAt).toBeUndefined();
        expect(executor.executePromotion).toHaveBeenCalledTimes(1);
        expect(executor.getPromotionResult).not.toHaveBeenCalled();
        expect(em.persist).not.toHaveBeenCalled();
      });
    });

    describe("향후 TDD backlog", () => {
      // 실제 failing test는 해당 요구사항의 TDD를 시작할 때 작성한다.
      it.todo("신규 지급 요청 후 결과가 SUCCESS인 경우에만 성공 처리한다");
      it.todo(
        "신규 지급 결과 PENDING이면 키를 유지하고 다음 워커에서 다시 조회한다",
      );
      it.todo(
        "프로모션 설정 및 인증 오류면 요청을 SUSPENDED로 보존하고 워커를 중단한다",
      );
      it.todo("요청 한도 초과 대응을 위한 호출량 제어 정책을 별도로 적용한다");
      it.todo(
        "DB 오류는 PROCESSING lease 복구에 맡기고 재시도 횟수를 추가 소모하지 않는다",
      );
    });
  });

  describe("지급 요청 선점", () => {
    it("조회한 요청을 처리 중으로 바꾸고 반환한다", async () => {
      const { service, em, repository } = setup();
      const requests = [
        createRequest({
          id: 1n,
          status: PointGrantStatus.PENDING,
          lockedAt: undefined,
        }),
        createRequest({
          id: 2n,
          status: PointGrantStatus.RETRY,
          lockedAt: undefined,
        }),
      ];
      repository.findEligibleGrantsWithLock.mockResolvedValue(requests);

      const result = await service.lockAndFetchEligibleGrants();

      expect(repository.findEligibleGrantsWithLock).toHaveBeenCalledTimes(1);
      expect(requests.map(({ status }) => status)).toEqual([
        PointGrantStatus.PROCESSING,
        PointGrantStatus.PROCESSING,
      ]);
      expect(requests.map(({ lockedAt }) => lockedAt)).toEqual([
        FIXED_NOW,
        FIXED_NOW,
      ]);
      expect(em.flush).toHaveBeenCalledTimes(1);
      expect(result).toEqual(requests);
    });
  });

  describe("지급 요청 생성", () => {
    it("명시한 지급 금액으로 요청을 생성한다", () => {
      const { service, em } = setup();

      service.enqueueGrant(1234, PointReason.MISSION, 7);

      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reason: PointReason.MISSION,
          pointAmount: 7,
        }),
      );
    });

    it("지급 금액을 생략하면 기본 금액으로 요청을 생성한다", () => {
      const { service, em } = setup();

      service.enqueueGrant(1234, PointReason.MISSION);

      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ pointAmount: PROMOTION_AMOUNT }),
      );
    });
  });
});
