jest.mock("src/common/util/time.util", () => ({
  getSeoulDayRange: () => ({
    start: new Date("2026-05-08T15:00:00.000Z"), // KST 2026-05-09 00:00
    end: new Date("2026-05-09T15:00:00.000Z"),
  }),
}));

import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AdView } from "src/modules/ad/ad-view.entity";
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

interface WhitelistOverrides {
  adGroupIdWhitelist?: string;
  shareModuleIdWhitelist?: string;
}

const buildConfigService = (overrides: WhitelistOverrides = {}) => ({
  get: jest.fn((key: string) => {
    switch (key) {
      case "SHARE_DAILY_CHARGE_LIMIT":
        return 5;
      case "AD_GROUP_ID_WHITELIST":
        return overrides.adGroupIdWhitelist ?? ALLOWED_AD_GROUP;
      case "SHARE_MODULE_ID_WHITELIST":
        return overrides.shareModuleIdWhitelist ?? ALLOWED_MODULE;
      default:
        return undefined;
    }
  }),
});

const buildService = (em: unknown, overrides: WhitelistOverrides = {}) =>
  new ChanceService(em as never, buildConfigService(overrides) as never);

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
      const service = buildService(em);

      const result = await service.chargeByAd(1, {
        adGroupId: ALLOWED_AD_GROUP,
      });

      expect(result).toEqual({ count: 3 });
      const adViewCreated = persisted.find((p) => p instanceof AdView);
      expect(adViewCreated).toBeDefined();
      expect(fork.getReference).toHaveBeenCalled();
    });

    it("화이트리스트에 없는 adGroupId면 ForbiddenException + count 변화 없음", async () => {
      const existing = buildExisting({ count: 1 });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.chargeByAd(1, { adGroupId: "unknown-group" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(existing.count).toBe(1);
    });

    it("같은 사용자가 광고를 11번 시도해도 모두 통과 (캡 없음)", async () => {
      const existing = buildExisting({ count: 0 });
      const { em } = buildEm(existing);
      const service = buildService(em);

      for (let i = 0; i < 11; i++) {
        await service.chargeByAd(1, { adGroupId: ALLOWED_AD_GROUP });
      }

      expect(existing.count).toBe(11);
    });

    it("화이트리스트 환경변수가 비어 있으면 ServiceUnavailableException", async () => {
      const existing = buildExisting({ count: 1 });
      const { em } = buildEm(existing);
      const service = buildService(em, { adGroupIdWhitelist: "" });

      await expect(
        service.chargeByAd(1, { adGroupId: ALLOWED_AD_GROUP }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(existing.count).toBe(1);
    });
  });

  describe("chargeByShare", () => {
    it("contactsViral 채널: moduleId 통과 시 count++ 와 ShareLog INSERT", async () => {
      const existing = buildExisting({ count: 1 });
      const { em, persisted } = buildEm(existing, 0);
      const service = buildService(em);

      const result = await service.chargeByShare(1, {
        channel: "contactsViral",
        moduleId: ALLOWED_MODULE,
        rewardAmount: 1,
        rewardUnit: "그리기 기회",
      });

      expect(result).toEqual({ count: 2 });
      const shareLogCreated = persisted.find((p) => p instanceof ShareLog);
      expect(shareLogCreated).toBeDefined();
    });

    it("contactsViral + 화이트리스트 외 moduleId → 거부", async () => {
      const existing = buildExisting();
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(
        service.chargeByShare(1, {
          channel: "contactsViral",
          moduleId: "unknown",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(existing.count).toBe(0);
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

    it("공유 화이트리스트 환경변수가 비어 있으면 ServiceUnavailableException", async () => {
      const existing = buildExisting({ count: 1 });
      const { em } = buildEm(existing);
      const service = buildService(em, { shareModuleIdWhitelist: "" });

      await expect(
        service.chargeByShare(1, {
          channel: "contactsViral",
          moduleId: ALLOWED_MODULE,
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(existing.count).toBe(1);
    });
  });

  describe("consume", () => {
    it("count > 0이면 count-- 후 반환", async () => {
      const existing = buildExisting({ count: 3 });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.consume(1)).resolves.toEqual({ count: 2 });
      expect(existing.count).toBe(2);
    });

    it("count === 0이면 ConflictException + count 변화 없음", async () => {
      const existing = buildExisting({ count: 0 });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.consume(1)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(existing.count).toBe(0);
    });

    it("자정 리셋 후 count는 최소 1이므로 consume 가능", async () => {
      const existing = buildExisting({
        count: 0,
        lastResetAt: YESTERDAY_START,
      });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await expect(service.consume(1)).resolves.toEqual({ count: 0 });
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

    it("consume이 em.transactional 내부에서 실행된다", async () => {
      const existing = buildExisting({ count: 1 });
      const { em } = buildEm(existing);
      const service = buildService(em);

      await service.consume(1);

      expect(em.transactional).toHaveBeenCalled();
    });
  });
});
