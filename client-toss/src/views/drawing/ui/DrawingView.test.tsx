/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DrawingView from "./DrawingView";

const mockRouteState = {
  promptId: 1,
  promptStrokes: [],
  anonymousHash: "test-hash",
};

const renderWithState = () =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: "/drawing", state: mockRouteState }]}
    >
      <Routes>
        <Route path="/drawing" element={<DrawingView />} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("DrawingView", () => {
  it('페이지 타이틀 "그려주세요!"가 렌더링된다', () => {
    renderWithState();
    expect(screen.getByText("그려주세요!")).toBeInTheDocument();
  });

  it("캔버스 영역이 렌더링된다", () => {
    renderWithState();
    expect(screen.getByTestId("drawing-canvas")).toBeInTheDocument();
  });

  it("색상 팔레트 버튼 5개가 렌더링된다", () => {
    renderWithState();
    const colorButtons = screen.getAllByRole("button", { name: /색상/ });
    expect(colorButtons).toHaveLength(5);
  });

  it("뒤로가기, 초기화 버튼이 렌더링된다", () => {
    renderWithState();
    expect(
      screen.getByRole("button", { name: "한획 취소" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초기화" })).toBeInTheDocument();
  });

  it("타이머 프로그레스 바가 렌더링된다", () => {
    renderWithState();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("점수가 표시된다", () => {
    renderWithState();
    expect(screen.getByText(/점$/)).toBeInTheDocument();
  });

  it('"제출할래요" 버튼이 렌더링된다', () => {
    renderWithState();
    expect(screen.getByText("제출할래요")).toBeInTheDocument();
  });

  it("route state 없이 접근하면 홈으로 리다이렉트된다", () => {
    render(
      <MemoryRouter initialEntries={["/drawing"]}>
        <Routes>
          <Route path="/drawing" element={<DrawingView />} />
          <Route path="/" element={<div>홈</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("홈")).toBeInTheDocument();
  });
});
