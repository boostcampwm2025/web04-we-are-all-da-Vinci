import { describe, expect, it, jest } from "@jest/globals";
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
  const repository = {
    findEligibleGrantsWithLock: jest
      .fn<() => Promise<PointGrantRequest[]>>()
      .mockResolvedValue([]),
  };
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
  describe("지급 요청 일괄 처리", () => {
    it("선점한 요청을 순서대로 처리하고 반환한다", async () => {
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
      expect(result).toEqual(requests);
    });

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

    describe("운영 오류 처리", () => {
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

    describe("characterization: 현재 알려진 결함", () => {
      it("현재 동작: 프로모션 미실행 오류는 격리가 아니라 최종 실패로 기록한다", async () => {
        const { service, executor, em } = setup();
        const request = createRequest();
        executor.executePromotion.mockRejectedValueOnce(
          new ExternalPromotionError("4109", "promotion not running"),
        );

        await service.settleGrantRequest(request);

        expect(request.status).toBe(PointGrantStatus.FAILED);
        expect(request.failedMessage).toBe("promotion not running");
        expect(request.attemptCount).toBe(0);
        expect(request.pointIdempotencyKey).toBe("promotion-key");
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
