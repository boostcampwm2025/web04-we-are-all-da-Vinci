/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MemorizeView from "./MemorizeView";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/feature/drawing", () => ({
  drawPromptOnCanvas: vi.fn(),
  useCanvasSetup: () => ({
    containerRef: { current: null },
    canvasRef: { current: null },
    ctxRef: { current: null },
    canvasSize: 300,
  }),
}));

vi.mock("@/entities/phaseHeader", () => ({
  PhaseHeader: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/shared/ui/bannerAd", () => ({
  BannerAd: () => <div data-testid="banner-ad" />,
}));

const mockRouteState = {
  promptId: 1,
  promptStrokes: [
    {
      points: [[10], [20]] as [number[], number[]],
      color: [0, 0, 0] as [number, number, number],
    },
  ],
  anonymousHash: "test-hash",
};

const renderWithState = (state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/memorize", state: state ?? mockRouteState },
      ]}
    >
      <Routes>
        <Route path="/memorize" element={<MemorizeView />} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("MemorizeView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("route state가 있으면 정상 렌더링된다", () => {
    renderWithState();

    expect(screen.getByText("기억하세요!")).toBeInTheDocument();
    expect(
      screen.getByText(/\d+초 동안 그림을 기억하세요/),
    ).toBeInTheDocument();
  });

  it("10초 후 /drawing으로 자동 이동한다", () => {
    renderWithState();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(navigateMock).toHaveBeenCalledWith("/drawing", {
      state: {
        promptId: 1,
        promptStrokes: mockRouteState.promptStrokes,
        anonymousHash: "test-hash",
      },
      replace: true,
    });
  });

  it("route state 없이 접근하면 홈으로 리다이렉트된다", () => {
    render(
      <MemoryRouter initialEntries={["/memorize"]}>
        <Routes>
          <Route path="/memorize" element={<MemorizeView />} />
          <Route path="/" element={<div>홈</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // useRequiredState가 navigate("/", { replace: true }) 호출
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });
});
