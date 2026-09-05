import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rankingQueries } from "./rankingQueries";

describe("랭킹 쿼리 정의", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T15:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("내 순위와 TOP100 모두 오늘 단위라 KST 날짜가 키에 들어간다", () => {
    expect(rankingQueries.me().queryKey).toEqual([
      "rankings",
      "me",
      "2026-05-04",
    ]);
    expect(rankingQueries.list().queryKey).toEqual([
      "rankings",
      "list",
      "2026-05-04",
    ]);
  });

  it("TOP100은 strokes가 들어 크므로 영속하지 않고 5분 뒤 GC한다", () => {
    const list = rankingQueries.list();
    expect(list.meta?.persist).toBeUndefined();
    expect(list.gcTime).toBe(5 * 60 * 1000);
    expect(rankingQueries.me().meta?.persist).toBe(true);
  });
});
