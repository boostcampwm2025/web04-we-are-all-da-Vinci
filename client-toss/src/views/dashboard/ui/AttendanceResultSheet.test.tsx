/// <reference types="@testing-library/jest-dom/vitest" />
import { serverTossApi } from "@/shared/api";
import type { AttendanceCheckInResponse } from "@toss/shared";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import AttendanceResultSheet from "./AttendanceResultSheet";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    recoverAttendance: vi.fn(),
    declineAttendanceRecovery: vi.fn(),
  },
  getAnalyticsInstance: vi.fn().mockReturnValue(null),
}));

const mockShowAd = vi.fn();
const mockReloadAd = vi.fn();
vi.mock("@/feature/playChance/hooks/useFullScreenAd", () => ({
  useFullScreenAd: () => ({
    adStatus: "ready",
    isAdLoaded: true,
    showAd: mockShowAd,
    reloadAd: mockReloadAd,
    adGroupId: "ait.v2.live.932e847f2b0c499c",
  }),
}));

const mockedApi = serverTossApi as unknown as { recoverAttendance: Mock };

const continued: AttendanceCheckInResponse = {
  status: "continued",
  cycleDay: 3,
  recoverable: false,
  previousDay: null,
  rewardedDay: 3,
};
const broken: AttendanceCheckInResponse = {
  status: "reset_recoverable",
  cycleDay: 1,
  recoverable: true,
  previousDay: 2,
  rewardedDay: null,
};

describe("출석 결과 시트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowAd.mockResolvedValue({ unitType: "point", unitAmount: 1 });
    mockedApi.recoverAttendance.mockResolvedValue({
      cycleDay: 3,
      rewardedDay: 3,
    });
  });

  it("연속 출석이면 연속 일수와 적립 안내를 보여준다", () => {
    render(
      <AttendanceResultSheet
        result={continued}
        onClose={vi.fn()}
        onRecovered={vi.fn()}
      />,
    );

    expect(screen.getByText(/3일 연속출석/)).toBeInTheDocument();
    expect(screen.getByText(/적립/)).toBeInTheDocument();
  });

  it("끊긴 경우 광고 이어가기와 새롭게 시작하기를 함께 보여준다", () => {
    render(
      <AttendanceResultSheet
        result={broken}
        onClose={vi.fn()}
        onRecovered={vi.fn()}
      />,
    );

    expect(screen.getByText("연속출석이 끊겼어요!")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "광고 보고 이어가기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "새롭게 시작하기" }),
    ).toBeInTheDocument();
  });

  it("광고 보고 이어가기를 누르면 광고 시청 후 복구 API를 호출한다", async () => {
    const onClose = vi.fn();
    const onRecovered = vi.fn();
    render(
      <AttendanceResultSheet
        result={broken}
        onClose={onClose}
        onRecovered={onRecovered}
      />,
    );

    await act(async () => {
      screen.getByRole("button", { name: "광고 보고 이어가기" }).click();
    });

    await waitFor(() => {
      expect(mockShowAd).toHaveBeenCalled();
      // 서버 recover()는 adGroupId만 검증하므로 reward 페이로드는 보내지 않는다.
      expect(mockedApi.recoverAttendance).toHaveBeenCalledWith({
        adGroupId: "ait.v2.live.932e847f2b0c499c",
      });
      expect(onRecovered).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("result가 null이면 시트를 렌더하지 않는다", () => {
    render(
      <AttendanceResultSheet
        result={null}
        onClose={vi.fn()}
        onRecovered={vi.fn()}
      />,
    );

    expect(screen.queryByText("출석 체크")).not.toBeInTheDocument();
  });
});
