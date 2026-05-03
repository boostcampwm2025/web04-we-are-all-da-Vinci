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
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const now = () => new Date("2026-05-03T12:00:00.000Z").getTime();

  it("endTime 기준으로 남은 시간을 계산한다", () => {
    const endTime = now() + 10_000;
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(endTime, 10, onComplete));

    expect(result.current.timeLeft).toBe(10);
    expect(result.current.progress).toBe(0);
  });

  it("10초 후 onComplete가 정확히 1회 호출된다", () => {
    const endTime = now() + 10_000;
    const onComplete = vi.fn();
    renderHook(() => useCountdown(endTime, 10, onComplete));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("progress 값은 경과 시간에 비례한다", () => {
    const endTime = now() + 10_000;
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(endTime, 10, onComplete));

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.timeLeft).toBe(7);
    expect(result.current.progress).toBeCloseTo(0.3);
  });

  it("0초 이후 onComplete가 중복 호출되지 않는다", () => {
    const endTime = now() + 3_000;
    const onComplete = vi.fn();
    renderHook(() => useCountdown(endTime, 3, onComplete));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("백그라운드 복귀 시 경과 시간이 반영된다", () => {
    const endTime = now() + 30_000;
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(endTime, 30, onComplete));

    expect(result.current.timeLeft).toBe(30);

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(result.current.timeLeft).toBe(10);
  });

  it("백그라운드에서 endTime이 지나면 즉시 onComplete 호출", () => {
    const endTime = now() + 10_000;
    const onComplete = vi.fn();
    renderHook(() => useCountdown(endTime, 10, onComplete));

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("이미 지난 endTime이면 즉시 onComplete 호출", () => {
    const endTime = now() - 5_000;
    const onComplete = vi.fn();
    renderHook(() => useCountdown(endTime, 10, onComplete));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("리로드 후에도 progress가 정확하다", () => {
    // 30초 타이머에서 20초 경과 후 리로드 시뮬레이션
    const endTime = now() + 10_000; // 10초 남음
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(endTime, 30, onComplete));

    // totalSeconds=30, timeLeft=10 → progress = 1 - 10/30 ≈ 0.667
    expect(result.current.timeLeft).toBe(10);
    expect(result.current.progress).toBeCloseTo(0.667, 2);
  });

  it("MEMORIZE_SECONDS는 10이다", () => {
    expect(MEMORIZE_SECONDS).toBe(10);
  });

  it("DRAWING_SECONDS는 30이다", () => {
    expect(DRAWING_SECONDS).toBe(30);
  });
});
