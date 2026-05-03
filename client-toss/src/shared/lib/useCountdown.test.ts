import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DRAWING_SECONDS,
  MEMORIZE_SECONDS,
  useCountdown,
} from "./useCountdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("10초 후 onComplete가 정확히 1회 호출된다", () => {
    const onComplete = vi.fn();
    renderHook(() => useCountdown(10, onComplete));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("progress 값은 (total - timeLeft) / total이다", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(10, onComplete));

    expect(result.current.progress).toBe(0);
    expect(result.current.timeLeft).toBe(10);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.timeLeft).toBe(7);
    expect(result.current.progress).toBeCloseTo(0.3);
  });

  it("0초 이후 onComplete가 중복 호출되지 않는다", () => {
    const onComplete = vi.fn();
    renderHook(() => useCountdown(3, onComplete));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("MEMORIZE_SECONDS는 10이다", () => {
    expect(MEMORIZE_SECONDS).toBe(10);
  });

  it("DRAWING_SECONDS는 30이다", () => {
    expect(DRAWING_SECONDS).toBe(30);
  });
});
