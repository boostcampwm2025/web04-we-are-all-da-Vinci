import { ConfigService } from "@nestjs/config";
import { KEY_PREFIX, PromotionRateLimiter } from "./promotion-rate-limiter";

describe("프로모션 호출량 제한 설정", () => {
  it("사용자 제한 시간이 0이면 초기화를 거부한다", () => {
    const config = new ConfigService({ RL_USER_WINDOW: "0" });

    expect(() => new PromotionRateLimiter(config)).toThrow(
      "RL_USER_WINDOW는 양수 정수여야 합니다",
    );
  });

  describe.each([
    "RL_API_THRESHOLD",
    "RL_API_WINDOW",
    "RL_USER_THRESHOLD",
    "RL_USER_WINDOW",
  ])("%s 설정값 검증", (key) => {
    it.each(["", " ", "0", "-1", "1.5", "invalid", "NaN", "Infinity"])(
      "양수 정수가 아닌 값 %j이면 초기화를 거부한다",
      (value) => {
        const config = new ConfigService({ [key]: value });

        expect(() => new PromotionRateLimiter(config)).toThrow(
          `${key}는 양수 정수여야 합니다`,
        );
      },
    );

    it.each([1, "1"])("양수 정수 %j이면 초기화한다", (value) => {
      const config = new ConfigService({ [key]: value });

      expect(() => new PromotionRateLimiter(config)).not.toThrow();
    });
  });

  it("설정이 없으면 기본값으로 초기화한다", () => {
    expect(() => new PromotionRateLimiter(new ConfigService())).not.toThrow();
  });
});

describe("프로모션 호출량 제한 동작", () => {
  const createLimiter = () =>
    new PromotionRateLimiter(
      new ConfigService({
        RL_API_THRESHOLD: 1,
        RL_API_WINDOW: 60,
        RL_USER_THRESHOLD: 1,
        RL_USER_WINDOW: 3,
      }),
    );

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it.each([
    KEY_PREFIX.KEY_ISSUE,
    KEY_PREFIX.EXECUTE_PROMOTION,
    KEY_PREFIX.RESULT,
  ])(
    "API(%s)는 한도까지 허용하고 다음 호출은 남은 대기 시간과 함께 거부한다",
    async (key: KEY_PREFIX) => {
      const limiter = createLimiter();

      await expect(limiter.acquireApi(key)).resolves.toEqual({
        success: "SUCCESS",
        remainingPoints: 0,
        msBeforeNext: 60000,
      });
      jest.advanceTimersByTime(1000);

      await expect(limiter.acquireApi(key)).resolves.toEqual({
        success: "FAILED",
        remainingPoints: 0,
        msBeforeNext: 59000,
      });
    },
  );

  it("한 API의 한도를 소모해도 다른 API는 독립적으로 허용한다", async () => {
    const limiter = createLimiter();

    await limiter.acquireApi(KEY_PREFIX.KEY_ISSUE);
    await expect(
      limiter.acquireApi(KEY_PREFIX.KEY_ISSUE),
    ).resolves.toMatchObject({
      success: "FAILED",
    });

    await expect(
      limiter.acquireApi(KEY_PREFIX.EXECUTE_PROMOTION),
    ).resolves.toMatchObject({ success: "SUCCESS" });
    await expect(limiter.acquireApi(KEY_PREFIX.RESULT)).resolves.toMatchObject({
      success: "SUCCESS",
    });
  });

  it("동일 사용자의 한도 초과는 거부하지만 다른 사용자는 허용한다", async () => {
    const limiter = createLimiter();

    await expect(limiter.acquireUser("1234")).resolves.toMatchObject({
      success: "SUCCESS",
    });
    await expect(limiter.acquireUser("1234")).resolves.toEqual({
      success: "FAILED",
      remainingPoints: 0,
      msBeforeNext: 3000,
    });
    await expect(limiter.acquireUser("5678")).resolves.toMatchObject({
      success: "SUCCESS",
    });
  });

  it.each([
    ["API", 60000],
    ["사용자", 3000],
  ] as const)(
    "%s 제한 시간이 만료되면 다시 허용한다",
    async (scope, duration) => {
      const limiter = createLimiter();
      const acquire = () =>
        scope === "API"
          ? limiter.acquireApi(KEY_PREFIX.EXECUTE_PROMOTION)
          : limiter.acquireUser("1234");

      await acquire();
      jest.advanceTimersByTime(duration - 1);
      await expect(acquire()).resolves.toEqual({
        success: "FAILED",
        remainingPoints: 0,
        msBeforeNext: 1,
      });

      jest.advanceTimersByTime(1);

      await expect(acquire()).resolves.toEqual({
        success: "SUCCESS",
        remainingPoints: 0,
        msBeforeNext: duration,
      });
    },
  );

  it("차감한 API quota를 복구하면 만료 전에도 한 번 다시 허용한다", async () => {
    const limiter = createLimiter();
    await limiter.acquireApi(KEY_PREFIX.EXECUTE_PROMOTION);

    await limiter.recoverApi(KEY_PREFIX.EXECUTE_PROMOTION);

    await expect(
      limiter.acquireApi(KEY_PREFIX.EXECUTE_PROMOTION),
    ).resolves.toMatchObject({ success: "SUCCESS", remainingPoints: 0 });
    await expect(
      limiter.acquireApi(KEY_PREFIX.EXECUTE_PROMOTION),
    ).resolves.toMatchObject({ success: "FAILED" });
  });
});
