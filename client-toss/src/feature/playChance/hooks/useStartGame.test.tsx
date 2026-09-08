import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayChanceContext } from "../model/playChanceContext";
import type { PlayChanceContextValue } from "../model/playChanceContext";
import { useStartGame } from "./useStartGame";

const { navigateMock, showAdMock, reloadAdMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  showAdMock: vi.fn(),
  reloadAdMock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));

vi.mock("./useFullScreenAd", () => ({
  useFullScreenAd: () => ({
    adStatus: "ready" as const,
    isAdLoaded: true,
    showAd: showAdMock,
    reloadAd: reloadAdMock,
    adGroupId: "ad-group-1",
  }),
}));

// useInFlight만 실제 구현을 쓴다 — 이 훅의 중복 방지 동작이 검증 대상이기 때문이다.
vi.mock("@/shared/lib", async () => ({
  ...(await vi.importActual<typeof import("@/shared/lib/useInFlight")>(
    "@/shared/lib/useInFlight",
  )),
  FUNNEL_EVENTS: {
    playStartAttempt: "play_start_attempt",
    playStartSuccess: "play_start_success",
    playStartFailed: "play_start_failed",
    adRewardAttempt: "ad_reward_attempt",
    adRewardSuccess: "ad_reward_success",
    adRewardFailed: "ad_reward_failed",
  },
  trackClick: vi.fn(),
  formatLocalDate: () => "2026-08-28",
  getAnonymousHash: vi.fn(async () => "anonymous-hash"),
  getErrorMessage: (err: unknown) => String(err),
}));

/** 서버 차감 호출 횟수를 세는 목. 이 값이 이 테스트의 전부다. */
const startPlayMock = vi.fn();
const chargeByAdMock = vi.fn();

/** 응답이 즉시 끝나지 않도록 한 tick 늦춘다 — 실제 네트워크처럼 겹치는 창을 만든다. */
const deferred = <T,>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), 0));

const contextValue = (): PlayChanceContextValue => ({
  chanceCount: 1,
  hasChance: true,
  isLoading: false,
  error: null,
  refresh: vi.fn(async () => 1),
  chargeByAd: chargeByAdMock,
  chargeByShare: vi.fn(),
  startPlay: startPlayMock,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <PlayChanceContext.Provider value={contextValue()}>
    {children}
  </PlayChanceContext.Provider>
);

describe("도전 시작", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    startPlayMock.mockImplementation(() =>
      deferred({ promptId: 1, strokes: [] }),
    );
    chargeByAdMock.mockImplementation(() => deferred(1));
    showAdMock.mockImplementation(() => deferred(undefined));
  });

  // 모바일 WebView에서 더블탭은 흔하다. isStarting이 useState라
  // 같은 렌더 사이클의 두 번째 호출이 갱신 전 값(false)을 보고 통과한다.
  // 결과: 기회가 두 번 차감된다.
  describe("같은 렌더 사이클에서 두 번 호출돼도", () => {
    it("보유 기회로 시작하면 서버 차감이 한 번만 일어난다", async () => {
      const { result } = renderHook(() => useStartGame(), { wrapper });

      await act(async () => {
        // 사이에 await를 두지 않는다 — 더블탭은 리렌더를 기다려주지 않는다.
        await Promise.all([
          result.current.start("nav"),
          result.current.start("nav"),
        ]);
      });

      expect(startPlayMock).toHaveBeenCalledTimes(1);
    });

    it("광고로 시작하면 광고 노출과 충전이 각각 한 번만 일어난다", async () => {
      const { result } = renderHook(() => useStartGame(), { wrapper });

      await act(async () => {
        await Promise.all([
          result.current.startWithAd("retry"),
          result.current.startWithAd("retry"),
        ]);
      });

      expect(showAdMock).toHaveBeenCalledTimes(1);
      expect(chargeByAdMock).toHaveBeenCalledTimes(1);
      expect(startPlayMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("정상 흐름", () => {
    it("한 번 호출하면 시작에 성공하고 기억 화면으로 이동한다", async () => {
      const { result } = renderHook(() => useStartGame(), { wrapper });

      let outcome: Awaited<ReturnType<typeof result.current.start>> | undefined;
      await act(async () => {
        outcome = await result.current.start("cta");
      });

      expect(outcome).toEqual({ ok: true });
      expect(startPlayMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith(
        "/memorize",
        expect.objectContaining({ replace: true }),
      );
    });

    // 성공 시에는 /memorize로 이동해 컴포넌트가 사라지므로 재호출 경로가 없다.
    // 의미 있는 재시도는 실패한 뒤다 — 이때는 다시 눌러야 한다.
    it("시작에 실패한 뒤에는 다시 시도할 수 있다", async () => {
      startPlayMock.mockImplementationOnce(() =>
        Promise.reject(new Error("네트워크 오류")),
      );
      const { result } = renderHook(() => useStartGame(), { wrapper });

      let first: Awaited<ReturnType<typeof result.current.start>> | undefined;
      await act(async () => {
        first = await result.current.start("cta");
      });
      expect(first).toEqual({ ok: false, reason: "error" });

      await act(async () => {
        await result.current.start("cta");
      });

      expect(startPlayMock).toHaveBeenCalledTimes(2);
    });
  });
});
