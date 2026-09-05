import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attendanceQueries } from "./attendanceQueries";

describe("출석 현황 쿼리 정의", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("KST 자정을 넘기면 키가 바뀐다 — 어제 캐시가 오늘 hit되지 않는다", () => {
    vi.setSystemTime(new Date("2026-05-03T14:59:59.000Z"));
    const before = attendanceQueries.status().queryKey;
    vi.setSystemTime(new Date("2026-05-03T15:00:00.000Z"));
    const after = attendanceQueries.status().queryKey;

    expect(before).toEqual(["attendance", "status", "2026-05-03"]);
    expect(after).toEqual(["attendance", "status", "2026-05-04"]);
  });

  it("영속 허용 목록에 들어 있고 하루 안에서는 재요청하지 않는다", () => {
    const options = attendanceQueries.status();
    expect(options.meta?.persist).toBe(true);
    expect(options.staleTime).toBe(Infinity);
  });
});
