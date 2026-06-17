/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AttendanceProgress from "./AttendanceProgress";

describe("출석 진행 컴포넌트", () => {
  it("7일 사이클을 모두 렌더한다", () => {
    render(<AttendanceProgress cycleDay={3} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });

  it("마일스톤(3·7일)에 5P 라벨을 보여준다", () => {
    render(<AttendanceProgress cycleDay={0} />);
    expect(screen.getAllByText("5P")).toHaveLength(2);
  });

  it("끊김 상태면 직전 위치 다음 칸을 ✕로 표시한다", () => {
    render(<AttendanceProgress cycleDay={1} recoverableDay={2} />);
    expect(screen.getByText("✕")).toBeInTheDocument();
  });
});
