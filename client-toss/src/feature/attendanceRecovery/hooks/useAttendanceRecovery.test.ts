/// <reference types="@testing-library/jest-dom/vitest" />
import { serverTossApi } from "@/shared/api";
import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAttendanceRecovery } from "./useAttendanceRecovery";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    recoverAttendance: vi.fn(),
    declineAttendanceRecovery: vi.fn(),
  },
  getAnalyticsInstance: vi.fn().mockReturnValue(null),
}));

const mockedApi = serverTossApi as unknown as {
  recoverAttendance: Mock;
  declineAttendanceRecovery: Mock;
};
const mockLoad = loadFullScreenAd as unknown as Mock & {
  isSupported: Mock;
};
const mockShow = showFullScreenAd as unknown as Mock;

type Handlers = { onEvent?: (event: { type: string; data?: unknown }) => void };

const RECOVERY_AD_GROUP = "ait.v2.live.932e847f2b0c499c";

describe("출석 복구 훅", () => {
  let loadHandlers: Handlers;
  let showHandlers: Handlers;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoad.isSupported.mockReturnValue(true);
    loadHandlers = {};
    showHandlers = {};
    mockLoad.mockImplementation((args: Handlers) => {
      loadHandlers.onEvent = args.onEvent;
      return vi.fn();
    });
    mockShow.mockImplementation((args: Handlers) => {
      showHandlers.onEvent = args.onEvent;
      return vi.fn();
    });
    mockedApi.recoverAttendance.mockResolvedValue({
      cycleDay: 3,
      rewardedDay: 3,
    });
    mockedApi.declineAttendanceRecovery.mockResolvedValue({
      cycleDay: 1,
      checkedToday: true,
      recoverable: false,
      previousDay: null,
      tomorrowMaxPoint: 0,
    });
  });

  const loadAd = () =>
    act(() => {
      loadHandlers.onEvent?.({ type: "loaded" });
    });

  it("보상 데이터 없이 userEarnedReward만 발생해도 시청을 인정하고 복구 API를 호출한다", async () => {
    const { result } = renderHook(() => useAttendanceRecovery());
    loadAd();

    let outcome;
    await act(async () => {
      const pending = result.current.recover();
      // 토스 애즈/AdMob이 data 없이 보상 이벤트를 내려주는 상황을 재현한다.
      showHandlers.onEvent?.({ type: "impression" });
      showHandlers.onEvent?.({ type: "userEarnedReward" });
      showHandlers.onEvent?.({ type: "dismissed" });
      outcome = await pending;
    });

    expect(outcome).toEqual({ ok: true });
    expect(mockedApi.recoverAttendance).toHaveBeenCalledWith({
      adGroupId: RECOVERY_AD_GROUP,
    });
  });

  it("끝까지 보지 않아(userEarnedReward 미발생) dismissed만 오면 복구하지 않는다", async () => {
    const { result } = renderHook(() => useAttendanceRecovery());
    loadAd();

    let outcome;
    await act(async () => {
      const pending = result.current.recover();
      showHandlers.onEvent?.({ type: "impression" });
      showHandlers.onEvent?.({ type: "dismissed" });
      outcome = await pending;
    });

    expect(outcome).toEqual({ ok: false, reason: "not_watched" });
    expect(mockedApi.recoverAttendance).not.toHaveBeenCalled();
  });

  it("광고가 아직 로드되지 않았으면 ad_not_ready를 반환한다", async () => {
    const { result } = renderHook(() => useAttendanceRecovery());
    // loaded 이벤트를 보내지 않아 isAdLoaded=false 유지.

    let outcome;
    await act(async () => {
      outcome = await result.current.recover();
    });

    expect(outcome).toEqual({ ok: false, reason: "ad_not_ready" });
    expect(mockShow).not.toHaveBeenCalled();
    expect(mockedApi.recoverAttendance).not.toHaveBeenCalled();
  });

  it("새롭게 시작하기는 광고 없이 복구 대상을 비우는 API를 호출한다", async () => {
    const { result } = renderHook(() => useAttendanceRecovery());

    let ok;
    await act(async () => {
      ok = await result.current.decline();
    });

    expect(ok).toBe(true);
    expect(mockedApi.declineAttendanceRecovery).toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });
});
