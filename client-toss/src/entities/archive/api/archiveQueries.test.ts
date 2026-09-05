import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { archiveQueries } from "./archiveQueries";

describe("아카이브 쿼리 정의", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T15:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("요약은 KST 날짜 키 + 영속, 날짜별 기록은 불변이라 날짜만 키이고 영속하지 않는다", () => {
    const summary = archiveQueries.summary();
    const day = archiveQueries.day("2026-05-01");

    expect(summary.queryKey).toEqual(["archive", "summary", "2026-05-04"]);
    expect(summary.meta?.persist).toBe(true);
    expect(day.queryKey).toEqual(["archive", "day", "2026-05-01"]);
    expect(day.meta?.persist).toBeUndefined();
    expect(day.staleTime).toBe(Infinity);
  });
});
