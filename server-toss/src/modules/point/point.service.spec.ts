import { describe, expect, it, jest } from "@jest/globals";
import {
  ExternalPromotionError,
  ExternalTransportError,
} from "src/common/errors/external.errors";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "./entity/point-grant-request.entity";
import { PointReason } from "./entity/point-log.entity";
import { PROMOTION_AMOUNT, PURGE_BATCH_SIZE } from "./point.contants";
import { PointService } from "./point.service";
import type { PointGrantResult } from "./port/point-grant-executer.interface";

const FIXED_NOW = new Date("2026-05-25T00:00:00.000Z");
const FIXED_DAY_RANGE = {
  start: new Date("2026-05-24T15:00:00.000Z"),
  end: new Date("2026-05-25T15:00:00.000Z"),
};

type MockPointGrantRequest = jest.Mocked<PointGrantRequest> & {};

jest.mock("src/common/util/time.util", () => ({
  getSeoulDateTime: jest.fn(() => FIXED_NOW),
  getSeoulDayRange: jest.fn(() => FIXED_DAY_RANGE),
}));

const buildEntityManager = () => ({
  create: jest.fn((_entity: unknown, data: Record<string, unknown>) => data),
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

const buildRequest = ({
  id = 1n,
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
} = {}) => {
  const request = {
    id,
    user: { userKey, name: "테스트유저" },
    reason,
    pointAmount,
    pointIdempotencyKey,
    failed: jest.fn(),
    processing: jest.fn(),
    retry: jest.fn(),
    wait: jest.fn(),
    succeeded: jest.fn(),
    setPointIdempotencyKey: jest.fn(),
  } as unknown as MockPointGrantRequest;

  request.setPointIdempotencyKey.mockImplementation((key) => {
    request.pointIdempotencyKey = key;
  });

  return request;
};

const setup = () => {
  const em = buildEntityManager();
  const repository = {
    findEligibleGrantsWithLock: jest
      .fn<() => Promise<PointGrantRequest[]>>()
      .mockResolvedValue([]),
  };
  const keyIssuer = {
    getPromotionKey: jest.fn(async () => "promotion-key"),
  };
  const executor = {
    executePromotion: jest.fn(async () => undefined),
    getPromotionResult: jest
      .fn<(userKey: number, key: string) => Promise<PointGrantResult | null>>()
      .mockResolvedValue("PENDING"),
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
      const { service } = setup();
      const requests = [buildRequest({ id: 1n }), buildRequest({ id: 2n })];
      jest
        .spyOn(service, "lockAndFetchEligibleGrants")
        .mockResolvedValue(requests);
      const settleSpy = jest
        .spyOn(service, "settleGrantRequest")
        .mockImplementation(async (request) => request);

      const result = await service.settleGrantRequests();

      expect(settleSpy).toHaveBeenNthCalledWith(1, requests[0]);
      expect(settleSpy).toHaveBeenNthCalledWith(2, requests[1]);
      expect(result).toEqual(requests);
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
    it("외부 지급이 성공하면 성공 상태를 기록한다", async () => {
      const { service } = setup();
      const request = buildRequest();
      const grantSpy = jest
        .spyOn(service, "grantPromotion")
        .mockResolvedValue();
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockResolvedValue();
      const failedSpy = jest
        .spyOn(service, "recordGrantOutcomeFromError")
        .mockResolvedValue();

      const result = await service.settleGrantRequest(request);

      expect(grantSpy).toHaveBeenCalledWith(request, "promotion-key");
      expect(succeededSpy).toHaveBeenCalledWith(request);
      expect(failedSpy).not.toHaveBeenCalled();
      expect(result).toBe(request);
    });

    it("외부 지급이 실패하면 오류에 따른 상태를 기록한다", async () => {
      const { service } = setup();
      const request = buildRequest();
      const error = new Error("external failed");
      jest.spyOn(service, "grantPromotion").mockRejectedValue(error);
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockResolvedValue();
      const failedSpy = jest
        .spyOn(service, "recordGrantOutcomeFromError")
        .mockResolvedValue();

      const result = await service.settleGrantRequest(request);

      expect(succeededSpy).not.toHaveBeenCalled();
      expect(failedSpy).toHaveBeenCalledWith(request, error);
      expect(result).toBe(request);
    });

    it("지급 키 발급이 실패하면 다음 워커가 키를 다시 발급해 지급한다", async () => {
      const { service, executor, keyIssuer } = setup();
      const request = buildRequest();
      keyIssuer.getPromotionKey
        .mockRejectedValueOnce(new ExternalTransportError("key timeout"))
        .mockResolvedValueOnce("reissued-key");
      const grantSpy = jest
        .spyOn(service, "grantPromotion")
        .mockResolvedValue();
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockResolvedValue();

      await service.settleGrantRequest(request);

      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(grantSpy).not.toHaveBeenCalled();
      expect(request.retry).toHaveBeenCalledTimes(1);

      await service.settleGrantRequest(request);

      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
      expect(grantSpy).toHaveBeenCalledWith(request, "reissued-key");
      expect(succeededSpy).toHaveBeenCalledWith(request);
    });

    it("발급한 지급 키 저장이 실패하면 다음 워커가 새 키를 발급해 지급한다", async () => {
      const { service, executor, keyIssuer } = setup();
      const request = buildRequest();
      keyIssuer.getPromotionKey
        .mockResolvedValueOnce("first-key")
        .mockResolvedValueOnce("second-key");
      const saveKeySpy = jest
        .spyOn(service, "savePointIdempotencyKey")
        .mockRejectedValueOnce(new Error("db failed"));
      const grantSpy = jest
        .spyOn(service, "grantPromotion")
        .mockResolvedValue();
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockResolvedValue();

      await service.settleGrantRequest(request);

      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
      expect(saveKeySpy).toHaveBeenNthCalledWith(1, request, "first-key");
      expect(request.pointIdempotencyKey).toBeUndefined();
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(grantSpy).not.toHaveBeenCalled();
      expect(request.retry).toHaveBeenCalledTimes(1);

      await service.settleGrantRequest(request);

      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
      expect(saveKeySpy).toHaveBeenNthCalledWith(2, request, "second-key");
      expect(grantSpy).toHaveBeenCalledWith(request, "second-key");
      expect(succeededSpy).toHaveBeenCalledWith(request);
    });
  });

  describe("지급 성공 기록", () => {
    it("요청을 성공 처리하고 같은 내용의 포인트 로그를 저장한다", async () => {
      const { service, em } = setup();
      const request = buildRequest();
      const createdLog = { id: 1n };
      em.create.mockReturnValue(createdLog);

      await service.recordGrantSucceeded(request);

      expect(request.succeeded).toHaveBeenCalledTimes(1);
      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          user: request.user,
          reason: request.reason,
          pointAmount: request.pointAmount,
        }),
      );
      expect(em.persist).toHaveBeenCalledWith(createdLog);
      expect(em.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe("지급 오류 처리", () => {
    it.each([
      ["서버 오류", new ExternalPromotionError("4110", "internal")],
      ["네트워크 오류", new ExternalTransportError("timeout")],
    ])(
      "지급 요청이 %s로 실패하면 다음 워커가 기존 키의 결과를 확인한다",
      async (_description, error) => {
        const { service, executor, keyIssuer } = setup();
        const request = buildRequest();
        const grantSpy = jest
          .spyOn(service, "grantPromotion")
          .mockRejectedValueOnce(error);

        await service.settleGrantRequest(request);

        expect(grantSpy).toHaveBeenCalledWith(request, "promotion-key");
        expect(executor.getPromotionResult).not.toHaveBeenCalled();
        expect(request.retry).toHaveBeenCalledTimes(1);

        await service.settleGrantRequest(request);

        expect(executor.getPromotionResult).toHaveBeenCalledWith(
          request.user.userKey,
          "promotion-key",
        );
        expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(1);
        expect(grantSpy).toHaveBeenCalledTimes(1);
        expect(request.wait).toHaveBeenCalledTimes(1);
      },
    );

    it("이미 처리된 지급 결과가 없으면 다음 워커가 새 키로 다시 지급한다", async () => {
      const { service, executor, keyIssuer } = setup();
      const request = buildRequest();
      keyIssuer.getPromotionKey
        .mockResolvedValueOnce("first-key")
        .mockResolvedValueOnce("second-key");
      executor.getPromotionResult.mockResolvedValue(null);
      const grantSpy = jest
        .spyOn(service, "grantPromotion")
        .mockRejectedValueOnce(
          new ExternalPromotionError("4113", "이미 처리됨"),
        );
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockResolvedValue();

      await service.settleGrantRequest(request);

      expect(grantSpy).toHaveBeenNthCalledWith(1, request, "first-key");
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(request.retry).toHaveBeenCalledTimes(1);

      await service.settleGrantRequest(request);

      expect(executor.getPromotionResult).toHaveBeenCalledWith(
        request.user.userKey,
        "first-key",
      );
      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
      expect(grantSpy).toHaveBeenNthCalledWith(2, request, "second-key");
      expect(succeededSpy).toHaveBeenCalledWith(request);
    });

    it("이미 처리된 지급 결과가 대기 중이면 다음 워커가 다시 확인한다", async () => {
      const { service, executor } = setup();
      const request = buildRequest();
      const grantSpy = jest
        .spyOn(service, "grantPromotion")
        .mockRejectedValueOnce(
          new ExternalPromotionError("4113", "이미 처리됨"),
        );
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockResolvedValue();

      await service.settleGrantRequest(request);

      expect(grantSpy).toHaveBeenCalledTimes(1);
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(request.retry).toHaveBeenCalledTimes(1);
      expect(succeededSpy).not.toHaveBeenCalled();

      await service.settleGrantRequest(request);

      expect(executor.getPromotionResult).toHaveBeenCalledWith(
        request.user.userKey,
        "promotion-key",
      );
      expect(grantSpy).toHaveBeenCalledTimes(1);
      expect(succeededSpy).not.toHaveBeenCalled();
      expect(request.retry).toHaveBeenCalledTimes(1);
      expect(request.wait).toHaveBeenCalledTimes(1);
    });

    it("이미 처리된 지급 결과가 완료이면 다음 워커가 성공 결과를 저장한다", async () => {
      const { service, executor } = setup();
      const request = buildRequest();
      executor.getPromotionResult.mockResolvedValue("SUCCESS");
      const grantSpy = jest
        .spyOn(service, "grantPromotion")
        .mockRejectedValueOnce(
          new ExternalPromotionError("4113", "이미 처리됨"),
        );
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockResolvedValue();

      await service.settleGrantRequest(request);

      expect(grantSpy).toHaveBeenCalledTimes(1);
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(request.retry).toHaveBeenCalledTimes(1);
      expect(succeededSpy).not.toHaveBeenCalled();

      await service.settleGrantRequest(request);

      expect(executor.getPromotionResult).toHaveBeenCalledWith(
        request.user.userKey,
        "promotion-key",
      );
      expect(grantSpy).toHaveBeenCalledTimes(1);
      expect(request.retry).toHaveBeenCalledTimes(1);
      expect(succeededSpy).toHaveBeenCalledWith(request);
    });

    it("이미 처리된 지급 결과가 실패이면 다음 워커가 새 키 발급을 준비한다", async () => {
      const { service, executor, keyIssuer } = setup();
      const request = buildRequest();
      executor.getPromotionResult.mockResolvedValue("FAILED");
      const grantSpy = jest
        .spyOn(service, "grantPromotion")
        .mockRejectedValueOnce(
          new ExternalPromotionError("4113", "이미 처리됨"),
        );

      await service.settleGrantRequest(request);

      expect(grantSpy).toHaveBeenCalledTimes(1);
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(request.retry).toHaveBeenCalledTimes(1);

      await service.settleGrantRequest(request);

      expect(executor.getPromotionResult).toHaveBeenCalledWith(
        request.user.userKey,
        "promotion-key",
      );
      expect(grantSpy).toHaveBeenCalledTimes(2);
      expect(request.retry).toHaveBeenCalledTimes(1);
      expect(keyIssuer.getPromotionKey).toHaveBeenCalledTimes(2);
    });

    it("지급 결과 확인이 실패하면 다음 워커가 같은 키로 다시 확인한다", async () => {
      const { service, executor } = setup();
      const request = buildRequest();
      executor.getPromotionResult
        .mockRejectedValueOnce(new ExternalTransportError("result timeout"))
        .mockResolvedValueOnce("SUCCESS");
      const grantSpy = jest
        .spyOn(service, "grantPromotion")
        .mockRejectedValueOnce(
          new ExternalPromotionError("4113", "이미 처리됨"),
        );
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockResolvedValue();

      await service.settleGrantRequest(request);

      expect(grantSpy).toHaveBeenCalledTimes(1);
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(request.retry).toHaveBeenCalledTimes(1);

      await service.settleGrantRequest(request);

      expect(executor.getPromotionResult).toHaveBeenCalledTimes(1);
      expect(request.wait).toHaveBeenCalledTimes(1);
      expect(succeededSpy).not.toHaveBeenCalled();

      await service.settleGrantRequest(request);

      expect(executor.getPromotionResult).toHaveBeenCalledTimes(2);
      expect(executor.getPromotionResult).toHaveBeenLastCalledWith(
        request.user.userKey,
        "promotion-key",
      );
      expect(grantSpy).toHaveBeenCalledTimes(1);
      expect(succeededSpy).toHaveBeenCalledWith(request);
    });

    it("지급 성공 결과 저장이 실패하면 다음 워커가 결과 확인 후 다시 저장한다", async () => {
      const { service, executor } = setup();
      const request = buildRequest();
      executor.getPromotionResult.mockResolvedValue("SUCCESS");
      const grantSpy = jest.spyOn(service, "grantPromotion");
      const succeededSpy = jest
        .spyOn(service, "recordGrantSucceeded")
        .mockRejectedValueOnce(new Error("db failed"))
        .mockResolvedValueOnce();

      await service.settleGrantRequest(request);

      expect(grantSpy).toHaveBeenCalledWith(request, "promotion-key");
      expect(executor.getPromotionResult).not.toHaveBeenCalled();
      expect(succeededSpy).toHaveBeenCalledTimes(1);
      expect(request.retry).toHaveBeenCalledTimes(1);

      await service.settleGrantRequest(request);

      expect(executor.getPromotionResult).toHaveBeenCalledWith(
        request.user.userKey,
        "promotion-key",
      );
      expect(grantSpy).toHaveBeenCalledTimes(1);
      expect(succeededSpy).toHaveBeenCalledTimes(2);
      expect(succeededSpy).toHaveBeenLastCalledWith(request);
    });

    it.each([
      ["외부 통신 오류", new ExternalTransportError("timeout")],
      [
        "재시도 가능한 프로모션 오류",
        new ExternalPromotionError("4110", "internal"),
      ],
      ["알 수 없는 오류", new Error("unknown")],
    ])("%s가 발생하면 재시도한다", async (_description, error) => {
      const { service, em } = setup();
      const request = buildRequest();

      await service.recordGrantOutcomeFromError(request, error);

      expect(request.retry).toHaveBeenCalledTimes(1);
      expect(request.failed).not.toHaveBeenCalled();
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it("재시도할 수 없는 프로모션 오류면 실패 처리한다", async () => {
      const { service, em } = setup();
      const request = buildRequest();

      await service.recordGrantOutcomeFromError(
        request,
        new ExternalPromotionError("4109", "promotion ended"),
      );

      expect(request.retry).not.toHaveBeenCalled();
      expect(request.failed).toHaveBeenCalledWith("promotion ended");
      expect(em.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe("지급 요청 선점", () => {
    it("조회한 요청을 처리 중으로 바꾸고 반환한다", async () => {
      const { service, em, repository } = setup();
      const requests = [buildRequest({ id: 1n }), buildRequest({ id: 2n })];
      repository.findEligibleGrantsWithLock.mockResolvedValue(requests);

      const result = await service.lockAndFetchEligibleGrants();

      expect(repository.findEligibleGrantsWithLock).toHaveBeenCalledTimes(1);
      expect(requests[0].processing).toHaveBeenCalledTimes(1);
      expect(requests[1].processing).toHaveBeenCalledTimes(1);
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
