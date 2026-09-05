import { describe, expect, it } from "vitest";
import { getKstDate } from "./getKstDate";

describe("KST 날짜 문자열", () => {
  it("UTC 자정 직전이라도 KST로는 이미 다음 날이다", () => {
    // 2026-05-03T15:00Z = 2026-05-04T00:00 KST
    expect(getKstDate(new Date("2026-05-03T14:59:59.000Z"))).toBe("2026-05-03");
    expect(getKstDate(new Date("2026-05-03T15:00:00.000Z"))).toBe("2026-05-04");
  });

  it("YYYY-MM-DD 형식으로 0을 채운다", () => {
    expect(getKstDate(new Date("2026-01-05T03:00:00.000Z"))).toBe("2026-01-05");
  });
});
