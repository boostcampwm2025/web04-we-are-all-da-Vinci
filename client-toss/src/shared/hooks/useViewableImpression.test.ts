import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useViewableImpression } from "./useViewableImpression";

const { trackImpressionMock } = vi.hoisted(() => ({
  trackImpressionMock: vi.fn(),
}));

vi.mock("@/shared/lib", () => ({
  trackImpression: trackImpressionMock,
}));

// 콜백을 직접 구동할 수 있는 IntersectionObserver 목.
type EntryLike = { intersectionRatio: number };

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  private readonly callback: (entries: EntryLike[]) => void;

  constructor(callback: (entries: EntryLike[]) => void) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  /** 교차 비율 변화를 한 번 흘려보낸다. */
  emit(ratio: number) {
    this.callback([{ intersectionRatio: ratio }]);
  }
}

const LOG_NAME = "banner_ad_impression";
const PARAMS = { ad_group_id: "ad-1" };

const mountHook = () => {
  const el = document.createElement("div");
  const ref = { current: el };
  renderHook(() => useViewableImpression(ref, LOG_NAME, PARAMS));
  const observer = MockIntersectionObserver.instances.at(-1);
  if (!observer) throw new Error("IntersectionObserver가 생성되지 않았어요.");
  return observer;
};

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("useViewableImpression (IAB Viewable 계측)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockIntersectionObserver.instances = [];
    trackImpressionMock.mockClear();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("면적 50% 이상이 1초 연속 유지되면 노출을 1회 집계한다", () => {
    const observer = mountHook();

    act(() => observer.emit(0.6));
    advance(1000);

    expect(trackImpressionMock).toHaveBeenCalledTimes(1);
    expect(trackImpressionMock).toHaveBeenCalledWith(LOG_NAME, PARAMS);
  });

  it("1초를 채우기 전에 50% 미만으로 빠지면 집계하지 않는다", () => {
    const observer = mountHook();

    act(() => observer.emit(0.6));
    advance(500);
    act(() => observer.emit(0.3));
    advance(1000);

    expect(trackImpressionMock).not.toHaveBeenCalled();
  });

  it("이탈 후 다시 진입하면 1초를 처음부터 다시 재서 집계한다", () => {
    const observer = mountHook();

    act(() => observer.emit(0.6));
    advance(500);
    act(() => observer.emit(0.3)); // 연속성 깨짐 → 리셋
    act(() => observer.emit(0.6)); // 재진입
    advance(999);
    expect(trackImpressionMock).not.toHaveBeenCalled();

    advance(1);
    expect(trackImpressionMock).toHaveBeenCalledTimes(1);
  });

  it("한 번 집계한 뒤에는 다시 노출돼도 중복 집계하지 않는다", () => {
    const observer = mountHook();

    act(() => observer.emit(0.6));
    advance(1000);
    expect(trackImpressionMock).toHaveBeenCalledTimes(1);

    act(() => observer.emit(0.3));
    act(() => observer.emit(0.6));
    advance(1000);

    expect(trackImpressionMock).toHaveBeenCalledTimes(1);
  });

  it("50% 미만 노출만으로는 집계하지 않는다", () => {
    const observer = mountHook();

    act(() => observer.emit(0.4));
    advance(2000);

    expect(trackImpressionMock).not.toHaveBeenCalled();
  });
});
