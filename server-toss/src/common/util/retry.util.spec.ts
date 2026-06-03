import { exponentialBackoff, withRetry } from "./retry.util";

describe("withRetry", () => {
  it("첫 시도에 성공하면 한 번만 호출돼요", async () => {
    const fn = jest.fn().mockResolvedValue("ok");

    const result = await withRetry(fn, {
      maxAttempts: 3,
      isRetryable: () => true,
      backoffMs: () => 0,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("transient 에러를 재시도한 뒤 성공해요", async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("ok");

    const onRetry = jest.fn();

    const result = await withRetry(fn, {
      maxAttempts: 3,
      isRetryable: () => true,
      backoffMs: () => 0,
      onRetry,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("isRetryable이 false면 즉시 throw해요", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("4xx"));

    await expect(
      withRetry(fn, {
        maxAttempts: 5,
        isRetryable: () => false,
        backoffMs: () => 0,
      }),
    ).rejects.toThrow("4xx");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("maxAttempts 모두 실패하면 마지막 에러를 throw해요", async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error("e1"))
      .mockRejectedValueOnce(new Error("e2"))
      .mockRejectedValueOnce(new Error("e3"));

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        isRetryable: () => true,
        backoffMs: () => 0,
      }),
    ).rejects.toThrow("e3");

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("backoffMs가 호출되어 attempt 인자를 받아요", async () => {
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error("e"))
      .mockRejectedValueOnce(new Error("e"))
      .mockResolvedValue("ok");

    const backoffMs = jest.fn().mockReturnValue(0);

    await withRetry(fn, {
      maxAttempts: 3,
      isRetryable: () => true,
      backoffMs,
    });

    expect(backoffMs).toHaveBeenNthCalledWith(1, 0);
    expect(backoffMs).toHaveBeenNthCalledWith(2, 1);
  });
});

describe("exponentialBackoff", () => {
  it("attempt에 따라 baseMs * 2^attempt 근사값을 반환해요", () => {
    const backoff = exponentialBackoff(100, 0); // jitter 0
    expect(backoff(0)).toBe(100);
    expect(backoff(1)).toBe(200);
    expect(backoff(2)).toBe(400);
    expect(backoff(3)).toBe(800);
  });

  it("jitterRatio 범위 안의 값을 반환해요", () => {
    const backoff = exponentialBackoff(1000, 0.25);
    for (let i = 0; i < 100; i++) {
      const value = backoff(0);
      expect(value).toBeGreaterThanOrEqual(750);
      expect(value).toBeLessThanOrEqual(1250);
    }
  });
});
