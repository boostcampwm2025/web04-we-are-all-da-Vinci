import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  setIosSwipeGestureEnabled,
  graniteEvent,
} from "@apps-in-toss/web-framework";
import { useExitGuard } from "./useExitGuard";

describe("useExitGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mount 시 iOS swipe를 비활성화한다", () => {
    renderHook(() => useExitGuard());

    expect(setIosSwipeGestureEnabled).toHaveBeenCalledWith({
      isEnabled: false,
    });
  });

  it("unmount 시 iOS swipe를 재활성화한다", () => {
    const { unmount } = renderHook(() => useExitGuard());

    unmount();

    expect(setIosSwipeGestureEnabled).toHaveBeenCalledWith({
      isEnabled: true,
    });
  });

  it("backEvent 발생 시 showDialog가 true가 된다", () => {
    const mockUnsub = vi.fn();
    vi.mocked(graniteEvent.addEventListener).mockReturnValue(mockUnsub);

    const { result } = renderHook(() => useExitGuard());

    expect(result.current.showDialog).toBe(false);

    // backEvent 콜백 추출 후 호출
    const call = vi.mocked(graniteEvent.addEventListener).mock.calls[0];
    const handler = call[1] as { onEvent: () => void };

    act(() => {
      handler.onEvent();
    });

    expect(result.current.showDialog).toBe(true);
  });
});
