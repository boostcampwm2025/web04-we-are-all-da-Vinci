import {
  nextCycleDay,
  rewardFor,
  rewardedDayFor,
  tomorrowMaxPoint,
} from "./cycle";

describe("출석 사이클 순수 함수", () => {
  describe("nextCycleDay", () => {
    it("사이클 중간에는 1씩 증가한다", () => {
      expect(nextCycleDay(1)).toBe(2);
      expect(nextCycleDay(6)).toBe(7);
    });

    it("7일(사이클 끝)에 도달하면 1로 초기화된다", () => {
      expect(nextCycleDay(7)).toBe(1);
    });
  });

  describe("rewardFor / rewardedDayFor", () => {
    it("3일·7일에만 5P를 지급한다", () => {
      expect(rewardFor(3)).toBe(5);
      expect(rewardFor(7)).toBe(5);
    });

    it("마일스톤이 아니면 0P, rewardedDay는 null이다", () => {
      for (const day of [1, 2, 4, 5, 6]) {
        expect(rewardFor(day)).toBe(0);
        expect(rewardedDayFor(day)).toBeNull();
      }
    });

    it("마일스톤이면 해당 일차를 rewardedDay로 돌려준다", () => {
      expect(rewardedDayFor(3)).toBe(3);
      expect(rewardedDayFor(7)).toBe(7);
    });
  });

  describe("tomorrowMaxPoint", () => {
    it("오늘 2일차면 내일(3일차)은 5P다", () => {
      expect(tomorrowMaxPoint(2)).toBe(5);
    });

    it("오늘 6일차면 내일(7일차)은 5P다", () => {
      expect(tomorrowMaxPoint(6)).toBe(5);
    });

    it("오늘 7일차면 내일은 1일차로 초기화되어 0P다", () => {
      expect(tomorrowMaxPoint(7)).toBe(0);
    });

    it("오늘 1일차면 내일(2일차)은 0P다", () => {
      expect(tomorrowMaxPoint(1)).toBe(0);
    });
  });
});
