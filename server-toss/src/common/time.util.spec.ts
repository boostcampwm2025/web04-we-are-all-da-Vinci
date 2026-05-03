import { describe, expect, it } from "@jest/globals";
import { getSeoulDayRange } from "./time.util";

describe("시간 유틸", () => {
  describe("getSeoulDayRange는", () => {
    describe("기준 시간이 주어지면", () => {
      it("서버 기준 일자 범위를 반환한다", () => {
        const { start, end } = getSeoulDayRange(
          new Date("2026-04-19T06:00:00.000Z"),
        );

        expect(start.toISOString()).toBe("2026-04-18T15:00:00.000Z");
        expect(end.toISOString()).toBe("2026-04-19T15:00:00.000Z");
      });
    });
  });
});
