/// <reference types="@testing-library/jest-dom/vitest" />
import { serverTossApi } from "@/shared/api";
import { formatLocalDate } from "@/shared/lib";
import { getDeviceId } from "@apps-in-toss/web-framework";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useAttendanceAutoCheckIn } from "./useAttendanceAutoCheckIn";

vi.mock("@/shared/api", () => ({
  serverTossApi: { checkInAttendance: vi.fn() },
}));

const mockedApi = serverTossApi as unknown as { checkInAttendance: Mock };
const GATE_KEY = "attendance_test-device";

describe("출석 자동 체크인 훅", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getDeviceId).mockResolvedValue({ deviceId: "test-device" });
  });

  it("당일 게이트가 닫혀 있으면 체크인하지 않는다", async () => {
    localStorage.setItem(GATE_KEY, formatLocalDate());

    renderHook(() => useAttendanceAutoCheckIn());

    await waitFor(() => expect(getDeviceId).toHaveBeenCalled());
    expect(mockedApi.checkInAttendance).not.toHaveBeenCalled();
  });

  it("첫 접근이면 체크인하고 결과를 올리며 게이트를 닫는다", async () => {
    mockedApi.checkInAttendance.mockResolvedValue({
      status: "continued",
      cycleDay: 3,
      recoverable: false,
      previousDay: null,
      rewardedDay: 3,
    });
    const onChecked = vi.fn();

    const { result } = renderHook(() =>
      useAttendanceAutoCheckIn({ onChecked }),
    );

    await waitFor(() => expect(result.current.result?.cycleDay).toBe(3));
    expect(localStorage.getItem(GATE_KEY)).toBe(formatLocalDate());
    expect(onChecked).toHaveBeenCalledTimes(1);
  });

  it("already면 시트를 띄우지 않지만 게이트는 닫는다", async () => {
    mockedApi.checkInAttendance.mockResolvedValue({
      status: "already",
      cycleDay: 2,
      recoverable: false,
      previousDay: null,
      rewardedDay: null,
    });

    const { result } = renderHook(() => useAttendanceAutoCheckIn());

    await waitFor(() =>
      expect(localStorage.getItem(GATE_KEY)).toBe(formatLocalDate()),
    );
    expect(result.current.result).toBeNull();
  });

  it("체크인 실패 시 게이트를 닫지 않아 다음에 재시도된다", async () => {
    mockedApi.checkInAttendance.mockRejectedValue(new Error("network"));

    renderHook(() => useAttendanceAutoCheckIn());

    await waitFor(() =>
      expect(mockedApi.checkInAttendance).toHaveBeenCalledTimes(1),
    );
    expect(localStorage.getItem(GATE_KEY)).toBeNull();
  });
});
