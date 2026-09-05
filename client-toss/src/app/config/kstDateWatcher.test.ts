import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installKstDateWatcher } from "./kstDateWatcher";

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("KST 자정 경계 감시", () => {
  let queryClient: QueryClient;
  let uninstall: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T14:00:00.000Z")); // 23:00 KST
    queryClient = new QueryClient();
    queryClient.setQueryData(["points", "summary", "2026-05-03"], {});
    queryClient.setQueryData(["user", "me"], {});
    uninstall = installKstDateWatcher(queryClient);
  });

  afterEach(() => {
    uninstall();
    vi.useRealTimers();
  });

  it("같은 날 포그라운드 복귀에는 아무것도 무효화하지 않는다", () => {
    vi.setSystemTime(new Date("2026-05-03T14:30:00.000Z"));
    setVisibility("visible");

    expect(
      queryClient.getQueryState(["points", "summary", "2026-05-03"])
        ?.isInvalidated,
    ).toBe(false);
  });

  it("자정을 넘겨 돌아오면 옛 날짜 키를 든 쿼리만 무효화한다", () => {
    vi.setSystemTime(new Date("2026-05-03T15:30:00.000Z")); // 00:30 KST 다음 날
    setVisibility("visible");

    expect(
      queryClient.getQueryState(["points", "summary", "2026-05-03"])
        ?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(["user", "me"])?.isInvalidated).toBe(
      false,
    );
  });

  it("백그라운드로 가는 이벤트는 무시한다", () => {
    vi.setSystemTime(new Date("2026-05-03T15:30:00.000Z"));
    setVisibility("hidden");

    expect(
      queryClient.getQueryState(["points", "summary", "2026-05-03"])
        ?.isInvalidated,
    ).toBe(false);
  });
});
