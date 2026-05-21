// reference 미지정 시 KST 2026-05-09 09:00(= UTC 2026-05-09 00:00)에 픽싱하고,
// 그 외엔 실제 구현을 그대로 호출해 알고리즘이 service와 일치하도록 보장.
jest.mock("src/common/util/time.util", () => {
  const actual = jest.requireActual<typeof import("src/common/util/time.util")>(
    "src/common/util/time.util",
  );
  return {
    getSeoulDayRange: jest.fn((reference?: Date) =>
      actual.getSeoulDayRange(
        reference ?? new Date("2026-05-09T00:00:00.000Z"),
      ),
    ),
  };
});

import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AdView } from "src/modules/chance/ad-view.entity";
import { ChanceWhitelistValidator } from "./chance-whitelist.validator";
import { ChanceService } from "./chance.service";
import { PlayChance } from "./play-chance.entity";
import { ShareLog } from "./share-log.entity";

// TODAY_START = KST 2026-05-09 00:00 (= UTC 2026-05-08 15:00). getSeoulDayRange()의 start와 일치.
const TODAY_START = new Date("2026-05-08T15:00:00.000Z");
// YESTERDAY_START = KST 2026-05-08 00:00. lastResetAt이 이 값이면 오늘 무료 플레이 가능.
const YESTERDAY_START = new Date("2026-05-07T15:00:00.000Z");
const ALLOWED_AD_GROUP = "ait.dev.allowed-group";
const ALLOWED_MODULE = "module-allowed";

interface EmApi {
  findOne: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  persist: jest.Mock;
  getReference: jest.Mock;
  flush: jest.Mock;
  transactional: jest.Mock;
}

const buildEm = (existing: PlayChance | null, todayShareLogs = 0) => {
  const persisted: unknown[] = [];
  const em: EmApi = {
    findOne: jest.fn(async () => existing),
    count: jest.fn(async (entity) =>
      entity === ShareLog ? todayShareLogs : 0,
    ),
    create: jest.fn((entity, data) => {
      const obj = Object.assign(
        entity === PlayChance
          ? new PlayChance()
          : entity === ShareLog
            ? new ShareLog()
            : new AdView(),
        data,
      );
      return obj;
    }),
    persist: jest.fn((entity) => {
      persisted.push(entity);
    }),
    getReference: jest.fn((_entity, key) => ({ userKey: key })),
    flush: jest.fn(async () => undefined),
    transactional: jest.fn(async (callback: (em: EmApi) => Promise<unknown>) =>
      callback(em),
    ),
  };
  return { em, persisted };
};

const buildConfigService = () => ({
  get: jest.fn((key: string) => {
    switch (key) {
      case "SHARE_DAILY_CHARGE_LIMIT":
        return 5;
      default:
        return undefined;
    }
  }),
});

const buildWhitelistValidator = () =>
  ({
    validateAdGroup: jest.fn(),
    validateShareModule: jest.fn(),
  }) as unknown as ChanceWhitelistValidator;

const buildService = (
  em: unknown,
  chanceWhitelistValidator = buildWhitelistValidator(),
) =>
  new ChanceService(
    em as never,
    buildConfigService() as never,
    chanceWhitelistValidator,
  );

const buildExisting = (overrides: Partial<PlayChance> = {}): PlayChance =>
  Object.assign(new PlayChance(), {
    userKey: 1,
    count: 0,
    lastResetAt: TODAY_START,
    ...overrides,
  });

describe("ChanceService", () => {
  describe("getMyChance", () => {
    it("기존 row가 없으면 무료 1회로 count=1을 반환한다", async () => {
      const { em } = buildEm(null);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 1 });
    });

    it("무료 미사용(어제 사용) 상태면 충전분 + 무료 1을 더해 반환한다", async () => {
      const existing = buildExisting({
        count: 4,
        lastResetAt: YESTERDAY_START,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 5 });
    });

    it("오늘 무료를 이미 사용했으면 충전분만 반환한다", async () => {
      const existing = buildExisting({ count: 5, lastResetAt: TODAY_START });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 5 });
    });

    it("같은 KST 날짜의 다른 시각(KST 23:00)이어도 무료는 사용한 것으로 본다", async () => {
      const existing = buildExisting({
        count: 0,
        lastResetAt: new Date("2026-05-09T14:00:00.000Z"), // KST 5/9 23:00
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 0 });
    });

    it("driver가 lastResetAt을 string으로 돌려줘도 KST 정규화 후 비교한다", async () => {
      const existing = buildExisting({
        count: 3,
        lastResetAt: "2026-05-08T15:00:00.000Z" as unknown as Date,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 3 });
    });
  });

  describe("lost update 회귀 방지 (getMyChance 읽기 전용 불변식)", () => {
    it("getMyChance는 persist/flush/transactional을 호출하지 않는다", async () => {
      const existing = buildExisting({
        count: 2,
        lastResetAt: YESTERDAY_START,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await service.getMyChance(1);

      expect(em.persist).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
      expect(em.transactional).not.toHaveBeenCalled();
    });

    it("getMyChance는 row 객체를 수정하지 않는다", async () => {
      const existing = buildExisting({
        count: 2,
        lastResetAt: YESTERDAY_START,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await service.getMyChance(1);

      expect(existing.count).toBe(2);
      expect(existing.lastResetAt).toBe(YESTERDAY_START);
    });
  });

  describe("consumeWithEntityManager", () => {
    it("당일 첫 플레이는 무료 — 충전분을 차감하지 않고 lastResetAt만 오늘로 갱신한다", async () => {
      const existing = buildExisting({
        count: 4,
        lastResetAt: YESTERDAY_START,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.consumeWithEntityManager(em as never, 1),
      ).resolves.toEqual({ count: 4 });
      expect(existing.count).toBe(4);
      expect(existing.lastResetAt).toEqual(TODAY_START);
    });

    it("무료 사용 가능하면 충전분이 0이어도 예외 없이 진행한다", async () => {
      const existing = buildExisting({
        count: 0,
        lastResetAt: YESTERDAY_START,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.consumeWithEntityManager(em as never, 1),
      ).resolves.toEqual({ count: 0 });
      expect(existing.lastResetAt).toEqual(TODAY_START);
    });

    it("무료를 이미 썼고 충전분이 있으면 count를 1 차감한다", async () => {
      const existing = buildExisting({ count: 3, lastResetAt: TODAY_START });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.consumeWithEntityManager(em as never, 1),
      ).resolves.toEqual({ count: 2 });
      expect(existing.count).toBe(2);
    });

    it("무료를 이미 썼고 충전분이 0이면 ConflictException + 변화 없음", async () => {
      const existing = buildExisting({ count: 0, lastResetAt: TODAY_START });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.consumeWithEntityManager(em as never, 1),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(existing.count).toBe(0);
    });

    it("row가 없으면 새로 생성하고 무료 플레이로 처리한다", async () => {
      const { em, persisted } = buildEm(null);
      const service = buildService(em);

      await expect(
        service.consumeWithEntityManager(em as never, 1),
      ).resolves.toEqual({ count: 0 });
      const created = persisted.find((p) => p instanceof PlayChance);
      expect(created).toBeDefined();
      expect(created?.lastResetAt).toEqual(TODAY_START);
    });
  });

  describe("충전분 이월", () => {
    it("충전분 4 보유 유저가 당일 첫 자동플레이를 해도 충전분은 4로 유지된다", async () => {
      const existing = buildExisting({
        count: 4,
        lastResetAt: YESTERDAY_START,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await service.consumeWithEntityManager(em as never, 1);

      expect(existing.count).toBe(4);
      // 무료를 소진했으므로 이후 조회는 충전분 4만 반환
      await expect(service.getMyChance(1)).resolves.toEqual({ count: 4 });
    });
  });

  describe("chargeByAd (광고 무제한)", () => {
    it("무료 미사용 상태면 count++ 후 충전분+무료를 반환한다", async () => {
      const existing = buildExisting({
        count: 2,
        lastResetAt: YESTERDAY_START,
      });
      const { em, persisted } = buildEm(existing);
      const chanceWhitelistValidator = buildWhitelistValidator();
      const service = buildService(em, chanceWhitelistValidator);

      const result = await service.chargeByAd(1, {
        adGroupId: ALLOWED_AD_GROUP,
      });

      expect(result).toEqual({ count: 4 }); // 충전분 3 + 무료 1
      expect(existing.count).toBe(3);
      expect(persisted.find((p) => p instanceof AdView)).toBeDefined();
      expect(chanceWhitelistValidator.validateAdGroup).toHaveBeenCalledWith(1, {
        adGroupId: ALLOWED_AD_GROUP,
      });
    });

    it("오늘 무료를 이미 썼으면 충전분만 반환한다", async () => {
      const existing = buildExisting({ count: 2, lastResetAt: TODAY_START });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.chargeByAd(1, { adGroupId: ALLOWED_AD_GROUP }),
      ).resolves.toEqual({ count: 3 });
    });

    it("같은 사용자가 광고를 11번 시도해도 모두 통과 (캡 없음)", async () => {
      const existing = buildExisting({ count: 0, lastResetAt: TODAY_START });
      const { em } = buildEm(existing);
      const chanceWhitelistValidator = buildWhitelistValidator();
      const service = buildService(em, chanceWhitelistValidator);

      for (let i = 0; i < 11; i++) {
        await service.chargeByAd(1, { adGroupId: ALLOWED_AD_GROUP });
      }

      expect(existing.count).toBe(11);
      expect(chanceWhitelistValidator.validateAdGroup).toHaveBeenCalledTimes(
        11,
      );
    });
  });

  describe("chargeByShare", () => {
    it("contactsViral 채널: moduleId 통과 시 count++ 와 ShareLog INSERT", async () => {
      const existing = buildExisting({ count: 1, lastResetAt: TODAY_START });
      const { em, persisted } = buildEm(existing, 0);
      const chanceWhitelistValidator = buildWhitelistValidator();
      const service = buildService(em, chanceWhitelistValidator);

      const result = await service.chargeByShare(1, {
        channel: "contactsViral",
        moduleId: ALLOWED_MODULE,
        rewardAmount: 1,
        rewardUnit: "그리기 기회",
      });

      expect(result).toEqual({ count: 2 });
      expect(persisted.find((p) => p instanceof ShareLog)).toBeDefined();
      expect(chanceWhitelistValidator.validateShareModule).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          channel: "contactsViral",
          moduleId: ALLOWED_MODULE,
        }),
      );
    });

    it("일일 캡(=5) 도달 시 거부", async () => {
      const existing = buildExisting({ count: 5, lastResetAt: TODAY_START });
      const { em } = buildEm(existing, 5);
      const service = buildService(em);

      await expect(
        service.chargeByShare(1, {
          channel: "contactsViral",
          moduleId: ALLOWED_MODULE,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(existing.count).toBe(5);
    });

    it("일일 캡 직전(4건)이면 통과 → 5번째 적립", async () => {
      const existing = buildExisting({ count: 4, lastResetAt: TODAY_START });
      const { em } = buildEm(existing, 4);
      const service = buildService(em);

      await expect(
        service.chargeByShare(1, {
          channel: "contactsViral",
          moduleId: ALLOWED_MODULE,
        }),
      ).resolves.toEqual({ count: 5 });
    });
  });

  describe("transactional 래핑", () => {
    it("chargeByAd가 em.transactional 내부에서 실행된다", async () => {
      const existing = buildExisting({ count: 0, lastResetAt: TODAY_START });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await service.chargeByAd(1, { adGroupId: ALLOWED_AD_GROUP });

      expect(em.transactional).toHaveBeenCalled();
    });

    it("chargeByShare가 em.transactional 내부에서 실행된다", async () => {
      const existing = buildExisting({ count: 0, lastResetAt: TODAY_START });
      const { em } = buildEm(existing, 0);
      const service = buildService(em);

      await service.chargeByShare(1, {
        channel: "contactsViral",
        moduleId: ALLOWED_MODULE,
      });

      expect(em.transactional).toHaveBeenCalled();
    });
  });
});
