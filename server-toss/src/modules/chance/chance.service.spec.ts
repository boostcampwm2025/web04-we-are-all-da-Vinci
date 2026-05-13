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

const TODAY_START = new Date("2026-05-08T15:00:00.000Z");
const YESTERDAY_START = new Date("2026-05-07T15:00:00.000Z");
const ALLOWED_AD_GROUP = "ait.dev.allowed-group";
const ALLOWED_MODULE = "module-allowed";

interface ForkApi {
  findOne: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  persist: jest.Mock;
  getReference: jest.Mock;
  flush: jest.Mock;
}

const buildEm = (existing: PlayChance | null, todayShareLogs = 0) => {
  const persisted: unknown[] = [];
  const fork: ForkApi = {
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
  };
  return {
    em: {
      transactional: jest.fn(
        async (callback: (em: ForkApi) => Promise<unknown>) => callback(fork),
      ),
    },
    fork,
    persisted,
  };
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
    it("기존 row가 없으면 count=1로 초기화하여 반환한다", async () => {
      const { em, fork } = buildEm(null);
      const service = buildService(em);

      const result = await service.getMyChance(1);

      expect(result).toEqual({ count: 1 });
      expect(fork.persist).toHaveBeenCalledTimes(1);
    });

    it("lastResetAt이 어제면 count는 최소 1을 보장하고 lastResetAt 갱신", async () => {
      const existing = buildExisting({
        count: 0,
        lastResetAt: YESTERDAY_START,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      const result = await service.getMyChance(1);

      expect(result).toEqual({ count: 1 });
      expect(existing.lastResetAt).toEqual(TODAY_START);
    });

    it("같은 날짜면 count를 그대로 유지한다", async () => {
      const existing = buildExisting({ count: 5 });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 5 });
    });
  });

  describe("chargeByAd (광고 무제한)", () => {
    it("화이트리스트 통과 시 count++ 와 AdView INSERT", async () => {
      const existing = buildExisting({ count: 2 });
      const { em, fork, persisted } = buildEm(existing);
      const chanceWhitelistValidator = buildWhitelistValidator();
      const service = buildService(em, chanceWhitelistValidator);

      const result = await service.chargeByAd(1, {
        adGroupId: ALLOWED_AD_GROUP,
      });

      expect(result).toEqual({ count: 3 });
      const adViewCreated = persisted.find((p) => p instanceof AdView);
      expect(adViewCreated).toBeDefined();
      expect(fork.getReference).toHaveBeenCalled();
      expect(chanceWhitelistValidator.validateAdGroup).toHaveBeenCalledWith(1, {
        adGroupId: ALLOWED_AD_GROUP,
      });
    });

    it("같은 사용자가 광고를 11번 시도해도 모두 통과 (캡 없음)", async () => {
      const existing = buildExisting({ count: 0 });
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
      const existing = buildExisting({ count: 1 });
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
      const shareLogCreated = persisted.find((p) => p instanceof ShareLog);
      expect(shareLogCreated).toBeDefined();
      expect(chanceWhitelistValidator.validateShareModule).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          channel: "contactsViral",
          moduleId: ALLOWED_MODULE,
        }),
      );
    });

    it("일일 캡(=5) 도달 시 거부", async () => {
      const existing = buildExisting({ count: 5 });
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
      const existing = buildExisting({ count: 4 });
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

  describe("consumeWithEntityManager", () => {
    it("count > 0이면 count-- 후 반환", async () => {
      const existing = buildExisting({ count: 3 });
      const { em, fork } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.consumeWithEntityManager(fork as never, 1),
      ).resolves.toEqual({
        count: 2,
      });
      expect(existing.count).toBe(2);
    });

    it("count === 0이면 ConflictException + count 변화 없음", async () => {
      const existing = buildExisting({ count: 0 });
      const { em, fork } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.consumeWithEntityManager(fork as never, 1),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(existing.count).toBe(0);
    });

    it("자정 리셋 후 count는 최소 1이므로 consume 가능", async () => {
      const existing = buildExisting({
        count: 0,
        lastResetAt: YESTERDAY_START,
      });
      const { em, fork } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.consumeWithEntityManager(fork as never, 1),
      ).resolves.toEqual({ count: 0 });
      expect(existing.count).toBe(0);
    });
  });

  describe("일일 리셋 (KST 정규화)", () => {
    it("lastResetAt이 TODAY_START(=KST 자정의 UTC 시각)면 리셋되지 않고 count가 유지된다", async () => {
      const existing = buildExisting({ count: 0, lastResetAt: TODAY_START });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 0 });
      expect(existing.count).toBe(0);
    });

    it("lastResetAt이 같은 KST 날짜의 다른 시각(KST 23:00)이어도 리셋되지 않는다", async () => {
      const existing = buildExisting({
        count: 0,
        lastResetAt: new Date("2026-05-09T14:00:00.000Z"), // KST 5/9 23:00
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 0 });
    });

    it("lastResetAt이 driver로부터 string으로 들어와도 KST 정규화 후 비교한다", async () => {
      const existing = buildExisting({
        count: 3,
        // 일부 driver는 datetime 컬럼을 string으로 돌려준다. 같은 KST 5/9이므로 유지돼야 한다.
        lastResetAt: "2026-05-08T15:00:00.000Z" as unknown as Date,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 3 });
    });

    it("같은 KST 날짜에 consume 후 다시 조회해도 count는 회복되지 않는다 (운영 버그 회귀)", async () => {
      const existing = buildExisting({ count: 1, lastResetAt: TODAY_START });
      const { em, fork } = buildEm(existing);
      const service = buildService(em);

      await service.consumeWithEntityManager(fork as never, 1);
      expect(existing.count).toBe(0);

      await expect(service.getMyChance(1)).resolves.toEqual({ count: 0 });
      expect(existing.count).toBe(0);
    });
  });

  describe("transactional 래핑", () => {
    it("chargeByAd가 em.transactional 내부에서 실행된다", async () => {
      const existing = buildExisting({ count: 0 });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await service.chargeByAd(1, { adGroupId: ALLOWED_AD_GROUP });

      expect(em.transactional).toHaveBeenCalled();
    });

    it("chargeByShare가 em.transactional 내부에서 실행된다", async () => {
      const existing = buildExisting({ count: 0 });
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
