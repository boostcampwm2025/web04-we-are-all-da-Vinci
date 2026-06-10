import { describe, expect, it } from "@jest/globals";
import {
  getSeoulDateKey,
  getSeoulDayRange,
  getSeoulDayRangeByDateKey,
} from "./time.util";

describe("시간 유틸", () => {
  describe("getSeoulDayRange는", () => {
    describe("기준 시간이 주어지면", () => {
      it("KST 기준 날짜 범위를 반환한다", () => {
        const { start, end } = getSeoulDayRange(
          new Date("2026-04-19T06:00:00.000Z"),
        );

        expect(start.toISOString()).toBe("2026-04-18T15:00:00.000Z");
        expect(end.toISOString()).toBe("2026-04-19T15:00:00.000Z");
      });
    });
  });

  describe("getSeoulDateKey는", () => {
    it("UTC 시간을 KST 날짜 문자열로 변환한다", () => {
      const result = getSeoulDateKey(new Date("2026-04-18T15:00:00.000Z"));

      expect(result).toBe("2026-04-19");
    });

    it("date 타입 컬럼이 문자열로 반환되어도 날짜 문자열을 유지한다", () => {
      const result = getSeoulDateKey("2026-04-19");

      expect(result).toBe("2026-04-19");
    });
  });

  describe("getSeoulDayRangeByDateKey는", () => {
    it("KST 날짜 문자열에 해당하는 UTC 범위를 반환한다", () => {
      const { start, end } = getSeoulDayRangeByDateKey("2026-04-19");

      expect(start.toISOString()).toBe("2026-04-18T15:00:00.000Z");
      expect(end.toISOString()).toBe("2026-04-19T15:00:00.000Z");
    });
  });
});
