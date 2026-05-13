/// <reference types="@testing-library/jest-dom/vitest" />
import { serverTossApi } from "@/shared/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubmittedView from "./SubmittedView";

const navigateMock = vi.fn();
const mockChargeByAd = vi.fn().mockResolvedValue(1);
const mockStartPlay = vi.fn().mockResolvedValue({
  promptId: 42,
  strokes: [{ points: [[1], [2]], color: [0, 0, 0] }],
});
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useOutletContext: () => ({
      chanceCount: 1,
      hasChance: true,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      chargeByAd: mockChargeByAd,
      chargeByShare: vi.fn(),
      consume: vi.fn(),
      startPlay: mockStartPlay,
    }),
  };
});

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    submitDrawing: vi.fn(),
  },
}));

vi.mock("@/entities/drawingCanvas", () => ({
  DrawingCanvasFrame: ({ children }: { children: ReactNode }) => (
    <div data-testid="canvas-frame">{children}</div>
  ),
  ReplayDrawingCanvas: () => <div data-testid="replay-drawing-canvas" />,
}));

vi.mock("@/shared/ui/score", () => ({
  Score: ({ value }: { value: number }) => <span>{value}점</span>,
}));

vi.mock("@/shared/ui/bannerAd", () => ({
  BannerAd: () => <div data-testid="banner-ad" />,
}));

const mockShowAd = vi.fn().mockResolvedValue(undefined);
const mockUseRewardAd = vi.fn(() => ({
  isAdLoaded: false as boolean,
  showAd: mockShowAd,
}));
vi.mock("@/feature/playChance", () => ({
  useRewardAd: () => mockUseRewardAd(),
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
    mockUseRewardAd.mockImplementation(() => ({
      isAdLoaded: false,
      showAd: mockShowAd,
    }));
  });

  it("점수와 완성 텍스트가 렌더링된다", () => {
    renderWithState();

    expect(screen.getByText("완성한 그림이에요")).toBeInTheDocument();
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

    await user.click(screen.getByText("이 그림으로 등록"));

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

    await user.click(screen.getByText("이 그림으로 등록"));

    await waitFor(() => {
      expect(
        screen.getByText("등록에 실패했어요. 다시 시도해주세요."),
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

    await user.click(screen.getByText("이 그림으로 등록"));

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
    renderWithState();

    await user.click(screen.getByText("광고·등록 없이 재도전"));

    await waitFor(() => {
      expect(mockStartPlay).toHaveBeenCalled();
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

  it("등록 안내 문구가 표시된다", () => {
    renderWithState();

    expect(
      screen.getByText(/등록하면 오늘 그린 최고 점수가 랭킹에 반영돼요/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/그림의 점수도 자세히 분석해드려요/),
    ).toBeInTheDocument();
  });

  it("다시하기 시 startPlay가 던지면 에러 토스트를 표시한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    mockStartPlay.mockRejectedValueOnce(new Error("startPlay 실패"));

    renderWithState();

    await user.click(screen.getByText("광고·등록 없이 재도전"));

    await waitFor(() => {
      expect(screen.getByText("다시 시도해주세요.")).toBeInTheDocument();
    });
  });

  it("다시하기 시 startPlay가 false 반환하면 부족 토스트를 표시하고 네비게이션하지 않는다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    mockStartPlay.mockResolvedValueOnce(null);

    renderWithState();

    await user.click(screen.getByText("광고·등록 없이 재도전"));

    await waitFor(() => {
      expect(mockStartPlay).toHaveBeenCalled();
      expect(screen.getByText("그리기 기회가 부족해요.")).toBeInTheDocument();
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("다시하기 시 getPrompt 실패하면 에러 토스트를 표시한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    mockStartPlay.mockRejectedValueOnce(new Error("프롬프트 실패"));

    renderWithState();

    await user.click(screen.getByText("광고·등록 없이 재도전"));

    await waitFor(() => {
      expect(screen.getByText("다시 시도해주세요.")).toBeInTheDocument();
    });
  });

  it("hasChance가 있으면 광고가 로드되어도 광고/chargeByAd 없이 startPlay만 호출한다", async () => {
    vi.useRealTimers();
    mockUseRewardAd.mockImplementation(() => ({
      isAdLoaded: true,
      showAd: mockShowAd,
    }));
    const user = userEvent.setup();
    mockStartPlay.mockResolvedValueOnce({
      promptId: 7,
      strokes: [],
    });

    renderWithState();

    await user.click(screen.getByText("광고·등록 없이 재도전"));

    await waitFor(() => {
      expect(mockStartPlay).toHaveBeenCalled();
    });
    expect(mockShowAd).not.toHaveBeenCalled();
    expect(mockChargeByAd).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      "/memorize",
      expect.objectContaining({
        state: expect.objectContaining({ promptId: 7 }),
      }),
    );
  });

  it("광고가 로드되지 않은 경우 다시하기 시 광고/chargeByAd 없이 startPlay만 호출한다", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    mockStartPlay.mockResolvedValueOnce({
      promptId: 8,
      strokes: [],
    });

    renderWithState();

    await user.click(screen.getByText("광고·등록 없이 재도전"));

    await waitFor(() => {
      expect(mockStartPlay).toHaveBeenCalled();
    });
    expect(mockShowAd).not.toHaveBeenCalled();
    expect(mockChargeByAd).not.toHaveBeenCalled();
  });
});
