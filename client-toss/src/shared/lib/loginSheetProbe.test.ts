import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startSheetProbe } from "./loginSheetProbe";

const { breadcrumbMock } = vi.hoisted(() => ({ breadcrumbMock: vi.fn() }));

vi.mock("./observability", () => ({
  leaveBreadcrumb: breadcrumbMock,
}));

const defineVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
};

const setVisibility = (state: DocumentVisibilityState) => {
  defineVisibility(state);
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("로그인 시트 가시성 프로브", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T00:00:00.000Z"));
    breadcrumbMock.mockClear();
  });

  afterEach(() => {
    defineVisibility("visible");
    vi.useRealTimers();
  });

  it("아무 이벤트가 없으면 시트가 보이지 않은 것으로 기록한다", () => {
    const probe = startSheetProbe();

    expect(probe.stop()).toEqual({
      sheetShown: false,
      hiddenMs: 0,
      transitions: 0,
    });
  });

  it("숨김 뒤 복귀하면 가려진 시간과 전환 수를 합산한다", () => {
    const probe = startSheetProbe();

    setVisibility("hidden");
    vi.advanceTimersByTime(1000);
    setVisibility("visible");

    expect(probe.stop()).toEqual({
      sheetShown: true,
      hiddenMs: 1000,
      transitions: 2,
    });
  });

  it("blur와 focus만 와도 같은 방식으로 기록한다", () => {
    const probe = startSheetProbe();

    window.dispatchEvent(new Event("blur"));
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event("focus"));

    expect(probe.stop()).toEqual({
      sheetShown: true,
      hiddenMs: 500,
      transitions: 2,
    });
  });

  it("blur 직후 visibilitychange가 겹쳐도 가려진 구간은 한 번만 센다", () => {
    const probe = startSheetProbe();

    window.dispatchEvent(new Event("blur"));
    vi.advanceTimersByTime(200);
    setVisibility("hidden");
    vi.advanceTimersByTime(300);
    setVisibility("visible");

    expect(probe.stop()).toEqual({
      sheetShown: true,
      hiddenMs: 500,
      transitions: 3,
    });
  });

  it("멈출 때까지 복귀하지 않았으면 멈춘 시점까지 합산한다", () => {
    const probe = startSheetProbe();

    setVisibility("hidden");
    vi.advanceTimersByTime(700);

    expect(probe.stop()).toEqual({
      sheetShown: true,
      hiddenMs: 700,
      transitions: 1,
    });
  });

  it("stop은 여러 번 불러도 같은 결과를 돌려주고 이후 이벤트는 무시한다", () => {
    const probe = startSheetProbe();
    setVisibility("hidden");
    vi.advanceTimersByTime(100);

    const first = probe.stop();
    setVisibility("visible");
    window.dispatchEvent(new Event("blur"));

    expect(probe.stop()).toBe(first);
    expect(first).toEqual({ sheetShown: true, hiddenMs: 100, transitions: 1 });
  });

  it("전환마다 브레드크럼을 남기고 종료 시 요약을 남긴다", () => {
    const probe = startSheetProbe();

    setVisibility("hidden");
    setVisibility("visible");
    probe.stop();

    expect(breadcrumbMock).toHaveBeenCalledTimes(3);
    expect(breadcrumbMock).toHaveBeenNthCalledWith(
      1,
      "auth",
      "로그인 시트 가시성 변화",
      expect.objectContaining({ event: "visibilitychange", state: "hidden" }),
    );
    expect(breadcrumbMock).toHaveBeenLastCalledWith(
      "auth",
      "로그인 시트 관측 종료",
      expect.objectContaining({ sheet_shown: true, visibility_transitions: 2 }),
    );
  });

  it("문서 객체를 주입하면 그 대상만 관측한다", () => {
    const fakeDoc = new EventTarget() as unknown as Document;
    Object.defineProperty(fakeDoc, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    const fakeWin = new EventTarget() as unknown as Window;
    const probe = startSheetProbe({ doc: fakeDoc, win: fakeWin });

    setVisibility("hidden");
    fakeDoc.dispatchEvent(new Event("visibilitychange"));

    expect(probe.stop()).toEqual({
      sheetShown: true,
      hiddenMs: 0,
      transitions: 1,
    });
  });
});
