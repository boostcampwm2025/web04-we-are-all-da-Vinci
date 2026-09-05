import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pointQueries } from "./pointQueries";

describe("포인트 요약 쿼리 정의", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("오늘 포인트가 날짜 단위라 KST 날짜가 키에 들어간다", () => {
    vi.setSystemTime(new Date("2026-05-03T15:00:00.000Z"));
    expect(pointQueries.summary().queryKey).toEqual([
      "points",
      "summary",
      "2026-05-04",
    ]);
  });

  it("사용자가 즉시 확인하는 값이라 30초 뒤엔 뒤에서 갱신하고, 영속 대상이다", () => {
    const options = pointQueries.summary();
    expect(options.staleTime).toBe(30_000);
    expect(options.meta?.persist).toBe(true);
  });
});
