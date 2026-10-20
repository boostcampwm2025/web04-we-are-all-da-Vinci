import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MikroORM } from "@mikro-orm/mysql";
import { Migrator } from "@mikro-orm/migrations";
import { ExternalApiError } from "src/common/errors/external.errors";
import { ExternalTransportError } from "src/common/errors/external.errors";
import { getSeoulDateTime } from "src/common/util/time.util";
import { User } from "src/modules/user/user.entity";
import {
  PointGrantRequest,
  PointGrantStatus,
} from "../entity/point-grant-request.entity";
import { PointLog, PointReason } from "../entity/point-log.entity";
import { PointService } from "../point.service";
import { PointGrantExecuter } from "../port/point-grant-executer.interface";
import { PointGrantKeyIssuer } from "../port/point-grant-key-issuer.interface";

describe("포인트 지급 DB rollback과 lease 복구", () => {
  let orm: MikroORM;
  const dbName = `point_recovery_test_${process.pid}`;

  beforeAll(async () => {
    // 애플리케이션 DB 설정을 사용하지 않는다.
    orm = await MikroORM.init({
      entities: [User, PointGrantRequest, PointLog],
      dbName,
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "",
      logger: () => undefined,
      extensions: [Migrator],
      migrations: {
        path: "src/migrations",
        snapshot: false,
        transactional: false,
        allOrNothing: false,
      },
    });
    await orm.migrator.up();
  }, 30_000);

  afterAll(async () => {
    if (orm) {
      try {
        await orm.schema.drop({ dropDb: true });
      } finally {
        await orm.close();
      }
    }
  });

  beforeEach(async () => {
    await orm.em
      .getConnection()
      .execute("drop trigger if exists reject_grant_success");
    await orm.schema.clear();
  });

  function createWorker() {
    // Nest에 주입되는 EM처럼 Transactional의 컨텍스트를 따라간다.
    const em = orm.em.fork({ useContext: true });
    const keyIssuer = {
      getPromotionKey: jest
        .fn<PointGrantKeyIssuer["getPromotionKey"]>()
        .mockResolvedValue("saved-key"),
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
      em.getRepository(PointGrantRequest),
      em,
      keyIssuer,
      executor,
    );
    return { service, executor, keyIssuer, em };
  }

  async function createRequest(overrides: Partial<PointGrantRequest> = {}) {
    const em = orm.em.fork();
    const user = em.create(User, {
      userKey: 1234,
      name: "테스트",
      nickname: "복구테스트",
    });
    const request = em.create(PointGrantRequest, {
      user,
      reason: PointReason.AD,
      pointAmount: 10,
      status: PointGrantStatus.PENDING,
      attemptCount: 2,
      maxAttemptCount: 5,
      ...overrides,
    });
    em.persist([user, request]);
    await em.flush();
    return request.id;
  }

  async function readRequest(id: bigint) {
    // rollback 후 메모리 객체가 아니라 다른 identity map에서 영속 상태를 읽는다.
    return orm.em.fork().findOneOrFail(PointGrantRequest, { id });
  }

  async function rejectSuccessSave() {
    // flush의 INSERT(PointLog) 뒤 UPDATE(request)를 실제 DB에서 실패시킨다.
    await orm.em.getConnection().execute(`
      create trigger reject_grant_success before update on point_grant_requests
      for each row begin
        if NEW.point_grant_status = 'succeeded' then
          signal sqlstate '45000' set message_text = 'point success save rejected';
        end if;
      end
    `);
  }

  it("전체 마이그레이션을 적용한 DB에서 설정 오류 요청을 SUSPENDED로 보존하고 재시작 시 PENDING으로 복구한다", async () => {
    const id = await createRequest();
    const worker = createWorker();
    const [request] = await worker.service.lockAndFetchEligibleGrants();
    worker.keyIssuer.getPromotionKey.mockRejectedValueOnce(
      new ExternalApiError(401, "인증 오류"),
    );

    await worker.service.settleGrantRequest(request);

    const suspended = await readRequest(id);
    expect(suspended.status).toBe(PointGrantStatus.SUSPENDED);
    expect(suspended.attemptCount).toBe(2);
    expect(worker.executor.executePromotion).not.toHaveBeenCalled();

    await createWorker().service.recoverSuspended();

    const recovered = await readRequest(id);
    expect(recovered.status).toBe(PointGrantStatus.PENDING);
    expect(recovered.attemptCount).toBe(2);
    expect(recovered.lockedAt).toBeNull();
  });

  it("SUSPENDED 요청이 남아 있으면 상태 ENUM 축소를 거부하고 복구 후에는 down/up할 수 있다", async () => {
    const id = await createRequest({ status: PointGrantStatus.SUSPENDED });
    try {
      await expect(
        orm.migrator.down({ migrations: ["Migration20261020010000"] }),
      ).rejects.toThrow("SUSPENDED 요청을 명시적으로 복구한 후");
      expect((await readRequest(id)).status).toBe(PointGrantStatus.SUSPENDED);

      await createWorker().service.recoverSuspended();
      await orm.migrator.down({ migrations: ["Migration20261020010000"] });
      expect((await readRequest(id)).status).toBe(PointGrantStatus.PENDING);
    } finally {
      await orm.migrator.up();
    }
    const em = orm.em.fork();
    const request = await em.findOneOrFail(PointGrantRequest, { id });
    request.suspend();
    await em.flush();
    expect((await readRequest(id)).status).toBe(PointGrantStatus.SUSPENDED);
  });

  it("성공 저장 DB 오류는 성공 상태와 PointLog를 rollback하고 선점 상태·키·횟수를 보존한다", async () => {
    const id = await createRequest();
    const { service, executor } = createWorker();
    const [request] = await service.lockAndFetchEligibleGrants();
    const claimed = await readRequest(id);
    expect(claimed.status).toBe(PointGrantStatus.PROCESSING);
    await rejectSuccessSave();

    await expect(service.settleGrantRequest(request)).rejects.toThrow(
      "point success save rejected",
    );

    const saved = await readRequest(id);
    expect(saved.status).toBe(PointGrantStatus.PROCESSING);
    expect(saved.pointIdempotencyKey).toBe("saved-key");
    expect(saved.attemptCount).toBe(2);
    expect(saved.lockedAt).toEqual(claimed.lockedAt);
    // 키 저장은 커밋됐지만 실패한 성공 저장은 버전을 올리지 않는다.
    expect(saved.version).toBe(claimed.version + 1);
    expect(saved.processedAt).toBeNull();
    expect(await orm.em.fork().count(PointLog, {})).toBe(0);
    expect(executor.executePromotion).toHaveBeenCalledTimes(1);
  });

  it("성공 저장 rollback 후 배치를 종료하여 다음 요청의 flush가 로그 없는 성공 상태를 저장하지 않는다", async () => {
    const firstId = await createRequest({ pointIdempotencyKey: "first-key" });
    const seedEm = orm.em.fork();
    const first = await seedEm.findOneOrFail(PointGrantRequest, firstId);
    const second = seedEm.create(PointGrantRequest, {
      user: first.user,
      reason: PointReason.AD,
      pointAmount: 10,
      status: PointGrantStatus.PENDING,
      attemptCount: 2,
      maxAttemptCount: 5,
      pointIdempotencyKey: "second-key",
    });
    seedEm.persist(second);
    await seedEm.flush();
    await rejectSuccessSave();

    const worker = createWorker();
    worker.executor.getPromotionResult.mockImplementation(async (_, key) => {
      // 다음 요청 시 DB 장애가 해소되어도 이전 요청의 변경을 저장하면 안 된다.
      if (key === "second-key") {
        await orm.em
          .getConnection()
          .execute("drop trigger reject_grant_success");
      }
      return { type: "SUCCESS" };
    });

    await expect(worker.service.settleGrantRequests()).resolves.toBe(false);

    for (const id of [firstId, second.id]) {
      const saved = await readRequest(id);
      expect(saved.status).toBe(PointGrantStatus.PROCESSING);
      expect(saved.attemptCount).toBe(2);
      expect(saved.processedAt).toBeNull();
      expect(saved.lockedAt).not.toBeNull();
    }
    expect((await readRequest(firstId)).pointIdempotencyKey).toBe("first-key");
    expect((await readRequest(second.id)).pointIdempotencyKey).toBe(
      "second-key",
    );
    expect(await orm.em.fork().count(PointLog, {})).toBe(0);
    expect(worker.executor.getPromotionResult).toHaveBeenCalledTimes(1);
    expect(worker.executor.getPromotionResult).toHaveBeenCalledWith(
      1234,
      "first-key",
    );
    expect(worker.executor.executePromotion).not.toHaveBeenCalled();
  });

  it("PROCESSING lease 만료 전에는 다음 워커가 재선점하지 않는다", async () => {
    const id = await createRequest({
      status: PointGrantStatus.PROCESSING,
      pointIdempotencyKey: "existing-key",
      lockedAt: new Date(getSeoulDateTime().getTime() - 14 * 60_000),
    });
    const claimed = await readRequest(id);
    const nextWorker = createWorker();

    expect(await nextWorker.service.lockAndFetchEligibleGrants()).toEqual([]);

    const saved = await readRequest(id);
    expect(saved.status).toBe(PointGrantStatus.PROCESSING);
    expect(saved.lockedAt).toEqual(claimed.lockedAt);
    expect(saved.pointIdempotencyKey).toBe("existing-key");
    expect(saved.attemptCount).toBe(2);
  });

  it.each([
    PointGrantStatus.PENDING,
    PointGrantStatus.RETRY,
    PointGrantStatus.PROCESSING,
  ])(
    "두 워커가 동시에 선점할 때 %s 요청은 한 워커만 가져간다",
    async (status) => {
      const expiredAt = new Date(getSeoulDateTime().getTime() - 16 * 60_000);
      const id = await createRequest({
        status,
        pointIdempotencyKey: "existing-key",
        nextRetryAt: expiredAt,
        lockedAt: expiredAt,
      });
      const firstWorker = createWorker();
      const secondWorker = createWorker();

      // 첫 선점의 잠금을 유지해 두 트랜잭션이 반드시 겹치게 한다.
      await firstWorker.em.begin();
      try {
        const firstClaims =
          await firstWorker.service.lockAndFetchEligibleGrants();
        expect(firstClaims.map(({ id }) => id)).toEqual([id]);
        expect(firstWorker.em.isInTransaction()).toBe(true);

        const secondClaims =
          await secondWorker.service.lockAndFetchEligibleGrants();
        expect(secondClaims).toEqual([]);

        await firstWorker.em.commit();
      } finally {
        if (firstWorker.em.isInTransaction()) {
          await firstWorker.em.rollback();
        }
      }

      const saved = await readRequest(id);
      expect(saved.status).toBe(PointGrantStatus.PROCESSING);
      expect(saved.pointIdempotencyKey).toBe("existing-key");
      expect(saved.attemptCount).toBe(2);
      expect(saved.lockedAt!.getTime()).toBeGreaterThan(expiredAt.getTime());
      expect(await secondWorker.service.lockAndFetchEligibleGrants()).toEqual(
        [],
      );
    },
  );

  it("PROCESSING lease 만료 후 재선점은 키·횟수를 보존하고 lockedAt을 갱신한다", async () => {
    const expiredAt = new Date(getSeoulDateTime().getTime() - 16 * 60_000);
    const id = await createRequest({
      status: PointGrantStatus.PROCESSING,
      pointIdempotencyKey: "existing-key",
      lockedAt: expiredAt,
    });
    const beforeClaim = await readRequest(id);

    const requests = await createWorker().service.lockAndFetchEligibleGrants();

    expect(requests.map(({ id }) => id)).toEqual([id]);
    const saved = await readRequest(id);
    expect(saved.status).toBe(PointGrantStatus.PROCESSING);
    expect(saved.pointIdempotencyKey).toBe("existing-key");
    expect(saved.attemptCount).toBe(2);
    expect(saved.version).toBe(beforeClaim.version + 1);
    expect(saved.lockedAt!.getTime()).toBeGreaterThan(expiredAt.getTime());
    expect(await createWorker().service.lockAndFetchEligibleGrants()).toEqual(
      [],
    );
  });

  it("지급 성공 후 저장 실패를 lease 복구하면 기존 키를 조회하고 추가 지급 없이 성공과 PointLog를 저장한다", async () => {
    const id = await createRequest();
    const firstWorker = createWorker();
    const [request] = await firstWorker.service.lockAndFetchEligibleGrants();
    await rejectSuccessSave();
    await expect(
      firstWorker.service.settleGrantRequest(request),
    ).rejects.toThrow("point success save rejected");
    expect(firstWorker.executor.executePromotion).toHaveBeenCalledTimes(1);
    expect((await readRequest(id)).pointIdempotencyKey).toBe("saved-key");
    expect(await orm.em.fork().count(PointLog, {})).toBe(0);

    await orm.em.getConnection().execute("drop trigger reject_grant_success");
    // 실제로 15분 기다리는 대신 DB의 lease 시각만 만료시킨다.
    await orm.em.fork().nativeUpdate(
      PointGrantRequest,
      { id },
      {
        lockedAt: new Date(getSeoulDateTime().getTime() - 16 * 60_000),
      },
    );
    const nextWorker = createWorker();
    const [recovered] = await nextWorker.service.lockAndFetchEligibleGrants();
    expect(recovered.id).toBe(id);

    await nextWorker.service.settleGrantRequest(recovered);

    expect(nextWorker.executor.getPromotionResult).toHaveBeenCalledTimes(1);
    expect(nextWorker.executor.getPromotionResult).toHaveBeenCalledWith(
      1234,
      "saved-key",
    );
    expect(nextWorker.keyIssuer.getPromotionKey).not.toHaveBeenCalled();
    expect(nextWorker.executor.executePromotion).not.toHaveBeenCalled();
    const saved = await readRequest(id);
    expect(saved.status).toBe(PointGrantStatus.SUCCEEDED);
    expect(saved.pointIdempotencyKey).toBe("saved-key");
    expect(saved.attemptCount).toBe(2);
    expect(saved.processedAt).toBeInstanceOf(Date);
    const logs = await orm.em.fork().find(PointLog, {});
    expect(logs).toHaveLength(1);
    expect(logs[0].user.userKey).toBe(1234);
    expect(logs[0].pointAmount).toBe(10);
    expect(logs[0].reason).toBe(PointReason.AD);
    expect(logs[0].pointGrantRequestId).toBe(id);
  });

  it("lease 복구 워커가 성공 저장한 뒤 이전 워커가 완료해도 PointLog는 하나만 생성한다", async () => {
    const id = await createRequest();
    const firstWorker = createWorker();
    const [request] = await firstWorker.service.lockAndFetchEligibleGrants();
    const resultQueryStarted = Promise.withResolvers<void>();
    const resumeResultQuery = Promise.withResolvers<void>();
    firstWorker.executor.getPromotionResult.mockImplementationOnce(async () => {
      resultQueryStarted.resolve();
      await resumeResultQuery.promise;
      return { type: "SUCCESS" };
    });

    // 이전 워커의 결과 조회만 지연시키고, 선점·키 저장 트랜잭션은 커밋한다.
    const firstSettlement = Promise.allSettled([
      firstWorker.service.settleGrantRequest(request),
    ]);
    const nextWorker = createWorker();
    try {
      await resultQueryStarted.promise;
      expect(firstWorker.executor.executePromotion).toHaveBeenCalledTimes(1);
      expect((await readRequest(id)).pointIdempotencyKey).toBe("saved-key");
      await orm.em
        .fork()
        .nativeUpdate(
          PointGrantRequest,
          { id },
          { lockedAt: new Date(getSeoulDateTime().getTime() - 16 * 60_000) },
        );

      const [recovered] = await nextWorker.service.lockAndFetchEligibleGrants();
      expect(recovered.id).toBe(id);
      await nextWorker.service.settleGrantRequest(recovered);
      expect((await readRequest(id)).status).toBe(PointGrantStatus.SUCCEEDED);
      expect(await orm.em.fork().count(PointLog, {})).toBe(1);
    } finally {
      // 이전 워커의 완료 거부/무시 방식은 고정하지 않고 영속 결과만 검증한다.
      resumeResultQuery.resolve();
      await firstSettlement;
    }

    expect(nextWorker.executor.getPromotionResult).toHaveBeenCalledWith(
      1234,
      "saved-key",
    );
    expect(nextWorker.keyIssuer.getPromotionKey).not.toHaveBeenCalled();
    expect(nextWorker.executor.executePromotion).not.toHaveBeenCalled();
    const saved = await readRequest(id);
    expect(saved.status).toBe(PointGrantStatus.SUCCEEDED);
    expect(saved.pointIdempotencyKey).toBe("saved-key");
    expect(saved.attemptCount).toBe(2);
    expect(await orm.em.fork().count(PointLog, {})).toBe(1);
  });

  it("완료 요청을 삭제해도 지급 로그와 요청 식별자는 유지한다", async () => {
    const id = await createRequest();
    const worker = createWorker();
    const [request] = await worker.service.lockAndFetchEligibleGrants();
    await worker.service.settleGrantRequest(request);

    await orm.em.fork().nativeDelete(PointGrantRequest, { id });

    expect(await orm.em.fork().count(PointGrantRequest, { id })).toBe(0);
    const logs = await orm.em
      .fork()
      .find(PointLog, { pointGrantRequestId: id });
    expect(logs).toHaveLength(1);
    expect(logs[0].pointAmount).toBe(10);
  });

  it("재선점 워커가 성공 처리하면 이전 워커의 늦은 timeout이 성공 상태를 RETRY로 덮어쓰지 않는다", async () => {
    const id = await createRequest({ pointIdempotencyKey: "existing-key" });
    const firstWorker = createWorker();
    const [request] = await firstWorker.service.lockAndFetchEligibleGrants();
    const queryStarted = Promise.withResolvers<void>();
    const resumeQuery = Promise.withResolvers<void>();
    firstWorker.executor.getPromotionResult.mockImplementationOnce(async () => {
      queryStarted.resolve();
      await resumeQuery.promise;
      throw new ExternalTransportError("timeout");
    });

    const firstSettlement = Promise.allSettled([
      firstWorker.service.settleGrantRequest(request),
    ]);
    try {
      await queryStarted.promise;
      await orm.em
        .fork()
        .nativeUpdate(
          PointGrantRequest,
          { id },
          { lockedAt: new Date(getSeoulDateTime().getTime() - 16 * 60_000) },
        );
      const nextWorker = createWorker();
      const [recovered] = await nextWorker.service.lockAndFetchEligibleGrants();
      expect(recovered.id).toBe(id);
      await nextWorker.service.settleGrantRequest(recovered);
      expect((await readRequest(id)).status).toBe(PointGrantStatus.SUCCEEDED);
      expect(
        await orm.em.fork().count(PointLog, { pointGrantRequestId: id }),
      ).toBe(1);
    } finally {
      resumeQuery.resolve();
      await firstSettlement;
    }

    const saved = await readRequest(id);
    expect(saved.status).toBe(PointGrantStatus.SUCCEEDED);
    expect(saved.attemptCount).toBe(2);
    expect(saved.pointIdempotencyKey).toBe("existing-key");
    expect(
      await orm.em.fork().count(PointLog, { pointGrantRequestId: id }),
    ).toBe(1);
  });

  it("키 발급 중 lease가 만료되어 다른 워커가 지급하면 이전 워커는 별도 키로 추가 지급하지 않는다", async () => {
    const id = await createRequest();
    const firstWorker = createWorker();
    const [request] = await firstWorker.service.lockAndFetchEligibleGrants();
    const keyIssueStarted = Promise.withResolvers<void>();
    const resumeKeyIssue = Promise.withResolvers<void>();
    firstWorker.keyIssuer.getPromotionKey.mockImplementationOnce(async () => {
      keyIssueStarted.resolve();
      await resumeKeyIssue.promise;
      return "old-worker-key";
    });
    const nextWorker = createWorker();
    nextWorker.keyIssuer.getPromotionKey.mockResolvedValue("new-worker-key");

    const firstSettlement = Promise.allSettled([
      firstWorker.service.settleGrantRequest(request),
    ]);
    try {
      await keyIssueStarted.promise;
      expect((await readRequest(id)).pointIdempotencyKey).toBeNull();
      await orm.em
        .fork()
        .nativeUpdate(
          PointGrantRequest,
          { id },
          { lockedAt: new Date(getSeoulDateTime().getTime() - 16 * 60_000) },
        );
      const [recovered] = await nextWorker.service.lockAndFetchEligibleGrants();
      expect(recovered.id).toBe(id);
      await nextWorker.service.settleGrantRequest(recovered);
      expect(nextWorker.executor.executePromotion).toHaveBeenCalledTimes(1);
      expect(nextWorker.executor.executePromotion).toHaveBeenCalledWith(
        1234,
        "new-worker-key",
        10,
      );
      expect((await readRequest(id)).status).toBe(PointGrantStatus.SUCCEEDED);
    } finally {
      resumeKeyIssue.resolve();
      await firstSettlement;
    }

    expect(firstWorker.executor.executePromotion).not.toHaveBeenCalled();
    const saved = await readRequest(id);
    expect(saved.status).toBe(PointGrantStatus.SUCCEEDED);
    expect(saved.pointIdempotencyKey).toBe("new-worker-key");
    expect(
      await orm.em.fork().count(PointLog, { pointGrantRequestId: id }),
    ).toBe(1);
  });
});
