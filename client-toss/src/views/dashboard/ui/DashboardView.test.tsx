/// <reference types="@testing-library/jest-dom/vitest" />
import { formatLocalDate } from "@/shared/lib";
import { getDeviceId } from "@apps-in-toss/web-framework";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardView from "./DashboardView";
import MyDrawingsPanel from "./MyDrawingsPanel";

const navigateMock = vi.fn();
const mockStartPlay = vi.fn().mockResolvedValue({
  promptId: 42,
  strokes: [{ points: [[1], [2]], color: [0, 0, 0] }],
});
const mockChargeByAd = vi.fn().mockResolvedValue(1);
const mockRefresh = vi.fn().mockResolvedValue(1);
const apiMockFns = vi.hoisted(() => ({
  getDailyPromptNotificationAgreement: vi.fn().mockResolvedValue({
    status: "unknown",
    templateCode: "agreement-template",
    agreedAt: null,
    rejectedAt: null,
    lastEventAt: null,
  }),
  saveDailyPromptNotificationAgreement: vi.fn().mockResolvedValue({
    status: "agreed",
    templateCode: "agreement-template",
    agreedAt: "2026-05-26T03:00:00.000Z",
    rejectedAt: null,
    lastEventAt: "2026-05-26T03:00:00.000Z",
  }),
  getOvertakenNotificationAgreement: vi.fn().mockResolvedValue({
    status: "unknown",
    templateCode: "overtaken-template",
    agreedAt: null,
    rejectedAt: null,
    lastEventAt: null,
  }),
  saveOvertakenNotificationAgreement: vi.fn().mockResolvedValue({
    status: "agreed",
    templateCode: "overtaken-template",
    agreedAt: "2026-05-26T03:00:00.000Z",
    rejectedAt: null,
    lastEventAt: "2026-05-26T03:00:00.000Z",
  }),
}));
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
    getMe: vi
      .fn()
      .mockResolvedValue({ userKey: 1, name: "테스터", nickname: "테스터닉" }),
    getDailyPromptNotificationAgreement:
      apiMockFns.getDailyPromptNotificationAgreement,
    saveDailyPromptNotificationAgreement:
      apiMockFns.saveDailyPromptNotificationAgreement,
    getOvertakenNotificationAgreement:
      apiMockFns.getOvertakenNotificationAgreement,
    saveOvertakenNotificationAgreement:
      apiMockFns.saveOvertakenNotificationAgreement,
  },
  getCachedNickname: vi.fn(() => null),
  setCachedNickname: vi.fn(),
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
vi.mock("@/feature/playChance", () => ({
  useFullScreenAd: () => mockUseFullScreenAd(),
  usePlayChanceContext: () => mockUsePlayChanceContext(),
}));

vi.mock("@/entities/myScoreCard", () => ({
  MyScoreCard: () => <div data-testid="score-card" />,
  useMyDrawings: () => ({ myDrawings: [], isLoading: false, refetch: vi.fn() }),
}));

vi.mock("@/entities/podium", () => ({
  Podium: () => <div data-testid="podium" />,
}));

vi.mock("@/entities/ranking", () => ({
  MyRankingSection: () => <div data-testid="my-ranking-section" />,
  RankingList: () => <div data-testid="ranking-list" />,
}));

vi.mock("@/shared/ui/bannerAd", () => ({
  BannerAd: () => <div data-testid="banner-ad" />,
}));

vi.mock("@toss/tds-colors", () => ({
  colors: {
    blue500: "#3182f6",
    grey100: "#f2f4f6",
    grey300: "#d1d6db",
    grey600: "#6b7684",
  },
}));

vi.mock("./MyDrawingsPanel", () => ({
  default: () => <div data-testid="my-ranking-section" />,
}));

const renderDashboard = (state?: unknown, pathname = "/") =>
  render(
    <MemoryRouter initialEntries={[{ pathname, state }]}>
      <Routes>
        <Route element={<DashboardView />}>
          <Route index element={<MyDrawingsPanel />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("DashboardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
    vi.mocked(getDeviceId).mockResolvedValue({ deviceId: "test-device" });
    apiMockFns.getDailyPromptNotificationAgreement.mockResolvedValue({
      status: "unknown",
      templateCode: "agreement-template",
      agreedAt: null,
      rejectedAt: null,
      lastEventAt: null,
    });
    apiMockFns.saveDailyPromptNotificationAgreement.mockResolvedValue({
      status: "agreed",
      templateCode: "agreement-template",
      agreedAt: "2026-05-26T03:00:00.000Z",
      rejectedAt: null,
      lastEventAt: "2026-05-26T03:00:00.000Z",
    });
    apiMockFns.getOvertakenNotificationAgreement.mockResolvedValue({
      status: "unknown",
      templateCode: "overtaken-template",
      agreedAt: null,
      rejectedAt: null,
      lastEventAt: null,
    });
    apiMockFns.saveOvertakenNotificationAgreement.mockResolvedValue({
      status: "agreed",
      templateCode: "overtaken-template",
      agreedAt: "2026-05-26T03:00:00.000Z",
      rejectedAt: null,
      lastEventAt: "2026-05-26T03:00:00.000Z",
    });
    mockUseFullScreenAd.mockImplementation(() => fullScreenAd("ready"));
    mockUsePlayChanceContext.mockImplementation(() => playChance(true));
  });

  it("첫 방문 시 getPrompt 호출 후 /memorize로 이동한다", async () => {
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

  it("getPrompt 실패 시 에러 메시지와 재시도 버튼을 표시한다", async () => {
    mockStartPlay.mockRejectedValueOnce(new Error("네트워크 오류"));

    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByText("서버 응답이 늦어지고 있어요. 다시 시도해주세요."),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("다시 시도해요")).toBeInTheDocument();
  });

  it("다시 시도 클릭 시 getPrompt를 재호출한다", async () => {
    const user = userEvent.setup();
    mockStartPlay
      .mockRejectedValueOnce(new Error("실패"))
      .mockResolvedValueOnce({
        promptId: 1,
        strokes: [],
      });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("다시 시도해요")).toBeInTheDocument();
    });

    await user.click(screen.getByText("다시 시도해요"));

    await waitFor(() => {
      expect(mockStartPlay).toHaveBeenCalledTimes(2);
    });
  });

  it("lastPlayed가 오늘이면 게임을 시작하지 않고 대시보드 UI를 표시한다", async () => {
    const today = formatLocalDate();
    localStorage.setItem("lastPlayed_test-device", today);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("my-ranking-section")).toBeInTheDocument();
    });

    expect(mockStartPlay).not.toHaveBeenCalled();
  });

  // 알림 동의 흐름은 카드형 CTA에서 헤더 종 아이콘 + Bottom Sheet 패턴으로 이전됨.
  // 동의 SDK 호출·저장 흐름은 NotificationCenterSheet 단위 테스트 영역.

  it("getDeviceId 실패 시 local 폴백으로 동작한다", async () => {
    vi.mocked(getDeviceId).mockRejectedValue(new Error("미지원"));
    mockStartPlay.mockResolvedValueOnce({
      promptId: 1,
      strokes: [],
    });

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

  it("플레이하기 버튼이 startGame을 호출한다", async () => {
    const today = formatLocalDate();
    localStorage.setItem("lastPlayed_test-device", today);
    const user = userEvent.setup();

    mockStartPlay.mockResolvedValueOnce({
      promptId: 99,
      strokes: [],
    });

    renderDashboard();

    // lastPlayed=오늘이므로 결과 UI가 먼저 표시됨
    await waitFor(() => {
      expect(screen.getByTestId("my-ranking-section")).toBeInTheDocument();
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
        expect(screen.getByTestId("my-ranking-section")).toBeInTheDocument();
      });
      expect(screen.getByText("광고 준비 중이에요")).toBeDisabled();
    });

    it("광고 로드 실패 시 '광고 다시 불러오기'를 누르면 reloadAd만 호출한다", async () => {
      mockUseFullScreenAd.mockImplementation(() => fullScreenAd("failed"));
      const user = userEvent.setup();

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId("my-ranking-section")).toBeInTheDocument();
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
        expect(screen.getByTestId("my-ranking-section")).toBeInTheDocument();
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
