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
    });
    await orm.schema.ensureDatabase();
    await orm.schema.create();
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
    expect(saved.processedAt).toBeNull();
    expect(await orm.em.fork().count(PointLog, {})).toBe(0);
    expect(executor.executePromotion).toHaveBeenCalledTimes(1);
  });

  it("PROCESSING lease 만료 전에는 다음 워커가 재선점하지 않는다", async () => {
    const id = await createRequest({ pointIdempotencyKey: "existing-key" });
    await createWorker().service.lockAndFetchEligibleGrants();
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
      const expiredAt = new Date(getSeoulDateTime().getTime() - 4 * 60_000);
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
    const expiredAt = new Date(getSeoulDateTime().getTime() - 4 * 60_000);
    const id = await createRequest({
      status: PointGrantStatus.PROCESSING,
      pointIdempotencyKey: "existing-key",
      lockedAt: expiredAt,
    });

    const requests = await createWorker().service.lockAndFetchEligibleGrants();

    expect(requests.map(({ id }) => id)).toEqual([id]);
    const saved = await readRequest(id);
    expect(saved.status).toBe(PointGrantStatus.PROCESSING);
    expect(saved.pointIdempotencyKey).toBe("existing-key");
    expect(saved.attemptCount).toBe(2);
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
    // 실제로 3분 기다리는 대신 DB의 lease 시각만 만료시킨다.
    await orm.em.fork().nativeUpdate(
      PointGrantRequest,
      { id },
      {
        lockedAt: new Date(getSeoulDateTime().getTime() - 4 * 60_000),
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
  });
});
