/// <reference types="@testing-library/jest-dom/vitest" />
import { serverTossApi } from "@/shared/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubmittedView from "./SubmittedView";

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

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    submitDrawing: vi.fn(),
    recordAdView: vi.fn().mockResolvedValue(undefined),
    getPrompt: vi.fn(),
  },
}));

vi.mock("@/feature/drawing", () => ({
  drawStrokesOnCanvas: vi.fn(),
  useCanvasSetup: () => ({
    containerRef: vi.fn(),
    canvasRef: { current: null },
    ctxRef: { current: null },
    canvasSize: 300,
  }),
}));

vi.mock("@/shared/ui/score", () => ({
  Score: ({ value }: { value: number }) => <span>{value}점</span>,
}));

vi.mock("@/shared/ui/bannerAd", () => ({
  BannerAd: () => <div data-testid="banner-ad" />,
}));

const mockCharge = vi.fn().mockResolvedValue(undefined);
const mockStartPlay = vi.fn().mockResolvedValue(true);
vi.mock("@/feature/playChance", () => ({
  usePlayChance: () => ({
    hasChance: true,
    isLoading: false,
    charge: mockCharge,
    startPlay: mockStartPlay,
  }),
}));

const mockRouteState = {
  promptId: 1,
  strokes: [{ points: [[10], [20]], color: [0, 0, 0] }],
  similarity: {
    score: 75.5,
    shapeSimilarity: 80,
    strokeMatchSimilarity: 70,
    penalty: 5,
  },
  anonymousHash: "test-hash",
};

const renderWithState = (state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/submitted", state: state ?? mockRouteState },
      ]}
    >
      <Routes>
        <Route path="/submitted" element={<SubmittedView />} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("SubmittedView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("점수와 완성 텍스트가 렌더링된다", () => {
    renderWithState();

    expect(screen.getByText("그림을 완성했어요")).toBeInTheDocument();
    expect(screen.getByText("76점")).toBeInTheDocument();
  });

  it("저장하기 클릭 시 submitDrawing을 호출하고 홈으로 이동한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    vi.mocked(serverTossApi.submitDrawing).mockResolvedValue({
      drawingId: 1,
      similarity: mockRouteState.similarity,
      promotionGranted: false,
    });

    renderWithState();

    await user.click(screen.getByText("저장하기"));

    await waitFor(() => {
      expect(serverTossApi.submitDrawing).toHaveBeenCalledWith(
        mockRouteState.strokes,
      );
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", {
        replace: true,
        state: { fromSubmitted: true, promotionGranted: false },
      });
    });
  });

  it("제출 실패 시 에러 토스트를 표시한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    vi.mocked(serverTossApi.submitDrawing).mockRejectedValue(
      new Error("서버 오류"),
    );

    renderWithState();

    await user.click(screen.getByText("저장하기"));

    await waitFor(() => {
      expect(
        screen.getByText("제출에 실패했어요. 다시 시도해주세요."),
      ).toBeInTheDocument();
    });
  });

  it("promotionGranted가 true이면 state에 포함하여 홈으로 이동한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    vi.mocked(serverTossApi.submitDrawing).mockResolvedValue({
      drawingId: 1,
      similarity: mockRouteState.similarity,
      promotionGranted: true,
    });

    renderWithState();

    await user.click(screen.getByText("저장하기"));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", {
        replace: true,
        state: { fromSubmitted: true, promotionGranted: true },
      });
    });
  });

  it("다시하기 클릭 시 charge → startPlay → getPrompt를 호출한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    vi.mocked(serverTossApi.getPrompt).mockResolvedValue({
      promptId: 42,
      strokes: [{ points: [[1], [2]], color: [0, 0, 0] }],
    });

    renderWithState();

    await user.click(screen.getByText("다시하기"));

    await waitFor(() => {
      expect(mockCharge).toHaveBeenCalled();
      expect(mockStartPlay).toHaveBeenCalled();
      expect(serverTossApi.getPrompt).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/memorize", {
        state: {
          promptId: 42,
          promptStrokes: [{ points: [[1], [2]], color: [0, 0, 0] }],
          anonymousHash: "test-hash",
        },
        replace: true,
      });
    });
  });

  it("저장하면 랭킹에 등록돼요 안내 문구가 표시된다", () => {
    renderWithState();

    expect(screen.getByText("저장하면 랭킹에 등록돼요")).toBeInTheDocument();
  });

  it("다시하기 시 charge 실패하면 에러 토스트를 표시한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    mockCharge.mockRejectedValueOnce(new Error("charge 실패"));

    renderWithState();

    await user.click(screen.getByText("다시하기"));

    await waitFor(() => {
      expect(screen.getByText("다시 시도해주세요.")).toBeInTheDocument();
    });
  });

  it("다시하기 시 startPlay가 false 반환하면 네비게이션하지 않는다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    mockStartPlay.mockResolvedValueOnce(false);

    renderWithState();

    await user.click(screen.getByText("다시하기"));

    await waitFor(() => {
      expect(mockStartPlay).toHaveBeenCalled();
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("다시하기 시 getPrompt 실패하면 에러 토스트를 표시한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    vi.mocked(serverTossApi.getPrompt).mockRejectedValueOnce(
      new Error("프롬프트 실패"),
    );

    renderWithState();

    await user.click(screen.getByText("다시하기"));

    await waitFor(() => {
      expect(screen.getByText("다시 시도해주세요.")).toBeInTheDocument();
    });
  });
});
