/// <reference types="@testing-library/jest-dom/vitest" />
import type {
  AttendanceStatusResponse,
  PointSummaryResponse,
} from "@toss/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import StreakStatsCard from "./StreakStatsCard";

vi.mock("@/entities/ranking", () => ({
  useMyRanking: () => ({ myRanking: undefined }),
}));

const renderCard = (
  status?: AttendanceStatusResponse,
  pointSummary?: PointSummaryResponse,
  missionMaxPoint?: number,
) =>
  render(
    <MemoryRouter>
      <StreakStatsCard
        status={status}
        pointSummary={pointSummary}
        missionMaxPoint={missionMaxPoint}
      />
    </MemoryRouter>,
  );

const baseStatus: AttendanceStatusResponse = {
  cycleDay: 2,
  checkedToday: true,
  recoverable: false,
  previousDay: null,
  tomorrowMaxPoint: 5,
};
const pointSummary: PointSummaryResponse = { totalPoints: 30, todayPoints: 5 };

describe("연속 출석 통계 카드", () => {
  it("출석 마일스톤 + 미션 포인트를 합쳐 내일 최대 포인트를 보여준다", () => {
    renderCard(baseStatus, pointSummary, 4);

    // 출석 5원 + 미션 4원 = 9원 (강조 span으로 분리 렌더)
    expect(screen.getByText(/내일도 참여하면 최대/)).toBeInTheDocument();
    expect(screen.getByText("9원")).toBeInTheDocument();
    expect(screen.getByText("2일")).toBeInTheDocument();
  });

  it("누적/오늘 포인트는 pointSummary에서 읽는다", () => {
    renderCard(baseStatus, pointSummary, 0);

    expect(screen.getByText("30원")).toBeInTheDocument(); // 누적
  });

  it("내일 받을 포인트가 없으면 다음 보상까지 남은 일수를 안내한다", () => {
    // cycleDay 1 → 내일은 2일차(마일스톤 아님), 미션도 0 → 다음 보상(3일)까지 2일
    renderCard(
      { ...baseStatus, cycleDay: 1, tomorrowMaxPoint: 0 },
      pointSummary,
      0,
    );

    expect(screen.getByText(/2일 더 출석하면/)).toBeInTheDocument();
  });

  it("출석·포인트 데이터가 없으면 기본 안내와 - 값을 보여준다", () => {
    renderCard(undefined, undefined, 0);

    expect(
      screen.getByText("매일 출석하고 토스포인트를 받아요"),
    ).toBeInTheDocument();
  });
});
