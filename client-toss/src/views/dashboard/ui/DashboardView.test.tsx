/// <reference types="@testing-library/jest-dom/vitest" />
import { formatLocalDate } from "@/shared/lib";
import { getDeviceId } from "@apps-in-toss/web-framework";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardView from "./DashboardView";

const navigateMock = vi.fn();
const mockStartPlay = vi.fn().mockResolvedValue({
  promptId: 42,
  strokes: [{ points: [[1], [2]], color: [0, 0, 0] }],
});
const mockChargeByAd = vi.fn().mockResolvedValue(1);
const mockRefresh = vi.fn().mockResolvedValue(1);

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

// 피드 카드는 DashboardView 로직 검증 범위 밖이라 목으로 대체한다.
// 단, ChallengeCard는 DashboardView가 만든 CTA 버튼을 그려야 하므로 cta를 렌더한다.
vi.mock("./ChallengeCard", () => ({
  default: ({ cta }: { cta: ReactNode }) => (
    <div data-testid="challenge-card">{cta}</div>
  ),
}));
vi.mock("./StreakStatsCard", () => ({
  default: () => <div data-testid="streak-card" />,
}));
vi.mock("./TodayMissionCard", () => ({
  default: () => <div data-testid="mission-card" />,
}));
vi.mock("./TodayDavinciCard", () => ({
  default: () => <div data-testid="davinci-card" />,
}));

vi.mock("@/feature/notification", () => ({
  NotificationCenterSheet: () => <div data-testid="notification-sheet" />,
  useNotificationAutoPrompt: () => ({ open: false, close: vi.fn() }),
}));

const mockShowAd = vi.fn().mockResolvedValue(undefined);
const mockReloadAd = vi.fn();
type AdStatus = "loading" | "ready" | "failed";
const fullScreenAd = (adStatus: AdStatus) => ({
  adStatus,
  isAdLoaded: adStatus === "ready",
  showAd: mockShowAd,
  reloadAd: mockReloadAd,
  adGroupId: "test-ad-group",
});
const mockUseFullScreenAd = vi.fn(() => fullScreenAd("ready"));
const playChance = (hasChance: boolean) => ({
  chanceCount: hasChance ? 1 : 0,
  hasChance,
  isLoading: false,
  error: null,
  refresh: mockRefresh,
  chargeByAd: mockChargeByAd,
  chargeByShare: vi.fn(),
  startPlay: mockStartPlay,
});
const mockUsePlayChanceContext = vi.fn(() => playChance(true));
// 통합 useStartGame이 컨텍스트/광고를 상대경로로 구독하므로 하위 모듈을 목한다.
// (배럴을 목하면 useStartGame 내부 구독에 안 닿음)
vi.mock("@/feature/playChance/model/playChanceContext", () => ({
  usePlayChanceContext: () => mockUsePlayChanceContext(),
}));
vi.mock("@/feature/playChance/hooks/useFullScreenAd", () => ({
  useFullScreenAd: () => mockUseFullScreenAd(),
}));

const renderDashboard = (state?: unknown, pathname = "/") =>
  render(
    <MemoryRouter initialEntries={[{ pathname, state }]}>
      <Routes>
        <Route path="/" element={<DashboardView />} />
      </Routes>
    </MemoryRouter>,
  );

describe("DashboardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
    vi.mocked(getDeviceId).mockResolvedValue({ deviceId: "test-device" });
    mockUseFullScreenAd.mockImplementation(() => fullScreenAd("ready"));
    mockUsePlayChanceContext.mockImplementation(() => playChance(true));
  });

  it("첫 방문 시 게임 시작 후 /memorize로 이동한다", async () => {
    renderDashboard();

    // 초기에는 "준비 중..." 로딩 표시
    expect(screen.getByText("준비 중이에요")).toBeInTheDocument();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/memorize", {
        state: {
          promptId: 42,
          promptStrokes: [{ points: [[1], [2]], color: [0, 0, 0] }],
          anonymousHash: "test-device",
        },
        replace: true,
      });
    });
  });

  it("게임 시작 실패 시 에러 메시지와 재시도 버튼을 표시한다", async () => {
    mockStartPlay.mockRejectedValueOnce(new Error("네트워크 오류"));

    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByText("서버 응답이 늦어지고 있어요. 다시 시도해주세요."),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("다시 시도해요")).toBeInTheDocument();
  });

  it("다시 시도 클릭 시 게임 시작을 재호출한다", async () => {
    const user = userEvent.setup();
    mockStartPlay
      .mockRejectedValueOnce(new Error("실패"))
      .mockResolvedValueOnce({ promptId: 1, strokes: [] });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("다시 시도해요")).toBeInTheDocument();
    });

    await user.click(screen.getByText("다시 시도해요"));

    await waitFor(() => {
      expect(mockStartPlay).toHaveBeenCalledTimes(2);
    });
  });

  it("lastPlayed가 오늘이면 게임을 시작하지 않고 피드를 표시한다", async () => {
    const today = formatLocalDate();
    localStorage.setItem("lastPlayed_test-device", today);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("challenge-card")).toBeInTheDocument();
    });

    expect(mockStartPlay).not.toHaveBeenCalled();
  });

  it("getDeviceId 실패 시 local 폴백으로 동작한다", async () => {
    vi.mocked(getDeviceId).mockRejectedValue(new Error("미지원"));
    mockStartPlay.mockResolvedValueOnce({ promptId: 1, strokes: [] });

    renderDashboard();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        "/memorize",
        expect.objectContaining({
          state: expect.objectContaining({ anonymousHash: "local" }),
        }),
      );
    });
  });

  it("fromSubmitted + promotionGranted=true일 때 포인트 토스트를 표시한다", async () => {
    renderDashboard({ fromSubmitted: true, promotionGranted: true });

    expect(
      await screen.findByText("포인트 지급이 완료됐어요"),
    ).toBeInTheDocument();
  });

  it("fromSubmitted + promotionGranted=false일 때 등록 완료 토스트를 표시한다", async () => {
    renderDashboard({ fromSubmitted: true, promotionGranted: false });

    expect(await screen.findByText("그림을 등록했어요")).toBeInTheDocument();
  });

  it("fromSubmitted 처리 후 history state를 초기화한다", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    renderDashboard({ fromSubmitted: true, promotionGranted: true });

    await screen.findByText("포인트 지급이 완료됐어요");

    expect(replaceStateSpy).toHaveBeenCalledWith({}, "");
    replaceStateSpy.mockRestore();
  });

  it("도전 버튼이 게임 시작을 호출한다", async () => {
    const today = formatLocalDate();
    localStorage.setItem("lastPlayed_test-device", today);
    const user = userEvent.setup();

    mockStartPlay.mockResolvedValueOnce({ promptId: 99, strokes: [] });

    renderDashboard();

    // lastPlayed=오늘이므로 피드가 먼저 표시됨
    await waitFor(() => {
      expect(screen.getByTestId("challenge-card")).toBeInTheDocument();
    });

    await user.click(screen.getByText(/광고 없이.*번 도전/));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/memorize", expect.anything());
    });
  });

  describe("잔여 기회 없음 — 광고 로드 상태별 도전 버튼", () => {
    beforeEach(() => {
      mockUsePlayChanceContext.mockImplementation(() => playChance(false));
      localStorage.setItem("lastPlayed_test-device", formatLocalDate());
    });

    it("광고 로드 중이면 '광고 준비 중이에요' 버튼이 비활성으로 표시된다", async () => {
      mockUseFullScreenAd.mockImplementation(() => fullScreenAd("loading"));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId("challenge-card")).toBeInTheDocument();
      });
      expect(screen.getByText("광고 준비 중이에요")).toBeDisabled();
    });

    it("광고 로드 실패 시 '광고 다시 불러오기'를 누르면 reloadAd만 호출한다", async () => {
      mockUseFullScreenAd.mockImplementation(() => fullScreenAd("failed"));
      const user = userEvent.setup();

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId("challenge-card")).toBeInTheDocument();
      });
      await user.click(screen.getByText("광고 다시 불러오기"));

      expect(mockReloadAd).toHaveBeenCalled();
      expect(mockStartPlay).not.toHaveBeenCalled();
    });

    it("광고 로드 완료 시 '5초 광고 보고 도전하기'를 누르면 광고 흐름을 진행한다", async () => {
      mockUseFullScreenAd.mockImplementation(() => fullScreenAd("ready"));
      mockStartPlay.mockResolvedValueOnce({ promptId: 11, strokes: [] });
      const user = userEvent.setup();

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId("challenge-card")).toBeInTheDocument();
      });
      await user.click(screen.getByText("5초 광고 보고 도전하기"));

      await waitFor(() => {
        expect(mockShowAd).toHaveBeenCalled();
        expect(mockChargeByAd).toHaveBeenCalled();
        expect(mockStartPlay).toHaveBeenCalled();
      });
    });
  });
});
