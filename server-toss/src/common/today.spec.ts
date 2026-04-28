import { getTodayKst } from "./today";

describe("getTodayKst", () => {
  it("서버 타임존과 무관하게 KST 날짜의 UTC 자정을 반환한다", () => {
    // UTC 2026-04-15 16:00 → KST 2026-04-16 01:00 → 반환: 2026-04-16 UTC 자정
    const now = new Date("2026-04-15T16:00:00Z");
    const result = getTodayKst(now);
    expect(result.toISOString()).toBe("2026-04-16T00:00:00.000Z");
  });

  it("KST 자정 직전(UTC 14:59)은 여전히 전날로 계산한다", () => {
    // UTC 2026-04-15 14:59 → KST 2026-04-15 23:59 → 반환: 2026-04-15 UTC 자정
    const now = new Date("2026-04-15T14:59:00Z");
    const result = getTodayKst(now);
    expect(result.toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });

  it("KST 자정 직후(UTC 15:00)은 다음 날로 넘어간다", () => {
    const now = new Date("2026-04-15T15:00:00Z");
    const result = getTodayKst(now);
    expect(result.toISOString()).toBe("2026-04-16T00:00:00.000Z");
  });
});
