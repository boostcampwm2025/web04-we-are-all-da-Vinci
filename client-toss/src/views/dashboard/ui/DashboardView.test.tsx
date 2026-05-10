/// <reference types="@testing-library/jest-dom/vitest" />
import { serverTossApi } from "@/shared/api";
import { formatLocalDate } from "@/shared/lib";
import { getDeviceId } from "@apps-in-toss/web-framework";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardView from "./DashboardView";

const navigateMock = vi.fn();
const mockStartPlay = vi.fn().mockResolvedValue(true);
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
    useOutletContext: () => ({
      chanceCount: 1,
      hasChance: true,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      chargeByAd: mockChargeByAd,
      chargeByShare: vi.fn(),
      consume: vi.fn(),
      startPlay: mockStartPlay,
    }),
  };
});

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    getPrompt: vi.fn(),
    recordAdView: vi.fn().mockResolvedValue(undefined),
    getMe: vi
      .fn()
      .mockResolvedValue({ userKey: 1, name: "테스터", nickname: "테스터닉" }),
  },
  getCachedNickname: vi.fn(() => null),
  setCachedNickname: vi.fn(),
}));

vi.mock("@/feature/playChance", () => ({
  useRewardAd: () => ({
    isAdLoaded: false,
    showAd: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/shared/ui/rewardAd", () => ({
  RewardAd: () => <div data-testid="reward-ad" />,
}));

vi.mock("@/entities/myScoreCard", () => ({
  MyScoreCard: () => <div data-testid="score-card" />,
  useMyDrawings: () => ({ myDrawings: [], isLoading: false, refetch: vi.fn() }),
}));

vi.mock("@/entities/podium", () => ({
  Podium: () => <div data-testid="podium" />,
}));

vi.mock("@/shared/ui/bannerAd", () => ({
  BannerAd: () => <div data-testid="banner-ad" />,
}));

vi.mock("@toss/tds-colors", () => ({
  colors: {
    blue500: "#3182f6",
    grey100: "#f2f4f6",
    grey600: "#6b7684",
  },
}));

const renderDashboard = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/", state }]}>
      <Routes>
        <Route path="/" element={<DashboardView />} />
      </Routes>
    </MemoryRouter>,
  );

describe("DashboardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getDeviceId).mockResolvedValue({ deviceId: "test-device" });
  });

  it("첫 방문 시 getPrompt 호출 후 /memorize로 이동한다", async () => {
    vi.mocked(serverTossApi.getPrompt).mockResolvedValue({
      promptId: 42,
      strokes: [{ points: [[1], [2]], color: [0, 0, 0] }],
    });

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
    vi.mocked(serverTossApi.getPrompt).mockRejectedValue(
      new Error("네트워크 오류"),
    );

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
    vi.mocked(serverTossApi.getPrompt)
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
      expect(serverTossApi.getPrompt).toHaveBeenCalledTimes(2);
    });
  });

  it("lastPlayed가 오늘이면 게임을 시작하지 않고 대시보드 UI를 표시한다", async () => {
    const today = formatLocalDate();
    localStorage.setItem("lastPlayed_test-device", today);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("podium")).toBeInTheDocument();
    });

    expect(serverTossApi.getPrompt).not.toHaveBeenCalled();
    expect(screen.getByText("아직 제출한 그림이 없어요")).toBeInTheDocument();
  });

  it("getDeviceId 실패 시 local 폴백으로 동작한다", async () => {
    vi.mocked(getDeviceId).mockRejectedValue(new Error("미지원"));
    vi.mocked(serverTossApi.getPrompt).mockResolvedValue({
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

    await waitFor(() => {
      expect(screen.getByTestId("podium")).toBeInTheDocument();
    });

    expect(screen.getByText("포인트 지급이 완료됐어요")).toBeInTheDocument();
  });

  it("fromSubmitted + promotionGranted=false일 때 등록 완료 토스트를 표시한다", async () => {
    renderDashboard({ fromSubmitted: true, promotionGranted: false });

    await waitFor(() => {
      expect(screen.getByTestId("podium")).toBeInTheDocument();
    });

    expect(screen.getByText("그림을 등록했어요")).toBeInTheDocument();
  });

  it("fromSubmitted 처리 후 history state를 초기화한다", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    renderDashboard({ fromSubmitted: true, promotionGranted: true });

    await waitFor(() => {
      expect(screen.getByTestId("podium")).toBeInTheDocument();
    });

    expect(replaceStateSpy).toHaveBeenCalledWith({}, "");
    replaceStateSpy.mockRestore();
  });

  it("플레이하기 버튼이 startGame을 호출한다", async () => {
    const today = formatLocalDate();
    localStorage.setItem("lastPlayed_test-device", today);
    const user = userEvent.setup();

    vi.mocked(serverTossApi.getPrompt).mockResolvedValue({
      promptId: 99,
      strokes: [],
    });

    renderDashboard();

    // lastPlayed=오늘이므로 결과 UI가 먼저 표시됨
    await waitFor(() => {
      expect(screen.getByTestId("podium")).toBeInTheDocument();
    });

    await user.click(screen.getByText(/광고 없이.*번 도전/));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/memorize", expect.anything());
    });
  });
});
