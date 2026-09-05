import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { podiumQueries } from "./podiumQueries";

describe("시상대 쿼리 정의", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T15:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("오늘 단위라 KST 날짜가 키에 들어가고 영속 대상이다", () => {
    const options = podiumQueries.today();
    expect(options.queryKey).toEqual(["podium", "2026-05-04"]);
    expect(options.meta?.persist).toBe(true);
    expect(options.staleTime).toBe(5 * 60 * 1000);
  });
});
