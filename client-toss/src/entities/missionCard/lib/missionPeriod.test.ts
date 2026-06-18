import { describe, expect, it } from "vitest";
import {
  getDailyMissionRangeLabel,
  getWeeklyMissionRangeLabel,
} from "./missionPeriod";

describe("미션 기간 라벨", () => {
  it("일일 미션은 KST 오늘 날짜와 0시~24시를 표기한다", () => {
    // 2026-06-18 KST 정오(=03:00Z) → "6월 18일 0시~24시".
    const noon = new Date("2026-06-18T03:00:00Z");
    expect(getDailyMissionRangeLabel(noon)).toBe("6월 18일 0시~24시");
  });

  it("일일 미션은 KST 자정 직후에도 그날 날짜를 유지한다", () => {
    // 2026-06-18 KST 00:30(=2026-06-17T15:30Z) → 여전히 6월 18일.
    const justAfterMidnight = new Date("2026-06-17T15:30:00Z");
    expect(getDailyMissionRangeLabel(justAfterMidnight)).toBe(
      "6월 18일 0시~24시",
    );
  });

  it("주간 미션은 KST 기준 그 주 월요일~일요일 범위를 표기한다", () => {
    // 2026-06-18은 KST 목요일 → 월요일 6/15, 일요일 6/21.
    const thursday = new Date("2026-06-18T03:00:00Z");
    expect(getWeeklyMissionRangeLabel(thursday)).toBe("6월 15일 ~ 6월 21일");
  });

  it("일요일에는 같은 주(월~일) 범위를 유지한다", () => {
    // 2026-06-21 KST 일요일 23시(=14:00Z) → 여전히 6/15~6/21.
    const sundayNight = new Date("2026-06-21T14:00:00Z");
    expect(getWeeklyMissionRangeLabel(sundayNight)).toBe("6월 15일 ~ 6월 21일");
  });

  it("월요일 0시 직후에는 새 주(월~일)로 넘어간다", () => {
    // 2026-06-22 KST 월요일 00:30(=2026-06-21T15:30Z) → 6/22~6/28.
    const mondayEarly = new Date("2026-06-21T15:30:00Z");
    expect(getWeeklyMissionRangeLabel(mondayEarly)).toBe("6월 22일 ~ 6월 28일");
  });

  it("월 경계를 넘는 주도 올바르게 표기한다", () => {
    // 2026-07-01은 KST 수요일 → 월요일 6/29, 일요일 7/5.
    const wednesday = new Date("2026-07-01T03:00:00Z");
    expect(getWeeklyMissionRangeLabel(wednesday)).toBe("6월 29일 ~ 7월 5일");
  });
});
