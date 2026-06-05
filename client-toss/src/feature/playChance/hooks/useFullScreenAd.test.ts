/// <reference types="@testing-library/jest-dom/vitest" />
import { loadFullScreenAd } from "@apps-in-toss/web-framework";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AD_LOAD_TIMEOUT_MS } from "../config/constants";
import { useFullScreenAd } from "./useFullScreenAd";

type AdHandlers = {
  onEvent?: (event: { type: string }) => void;
  onError?: (err: unknown) => void;
};

describe("useFullScreenAd", () => {
  const mockedLoad = loadFullScreenAd as unknown as ReturnType<typeof vi.fn> & {
    isSupported: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedLoad.mockReturnValue(vi.fn());
  });

  // spyOn 복원을 일괄 보장 — 테스트 중간 실패 시에도 spy가 누수되지 않게 한다.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("SDK 미지원 환경", () => {
    it("isSupported가 false면 즉시 ready 상태다", () => {
      mockedLoad.isSupported.mockReturnValue(false);

      const { result } = renderHook(() => useFullScreenAd());

      expect(result.current.adStatus).toBe("ready");
      expect(result.current.isAdLoaded).toBe(true);
    });
  });

  describe("SDK 지원 환경", () => {
    let handlers: AdHandlers;

    beforeEach(() => {
      vi.useFakeTimers();
      mockedLoad.isSupported.mockReturnValue(true);
      handlers = {};
      mockedLoad.mockImplementation((args: AdHandlers) => {
        handlers.onEvent = args.onEvent;
        handlers.onError = args.onError;
        return vi.fn();
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("마운트 직후엔 loading 상태다", () => {
      const { result } = renderHook(() => useFullScreenAd());

      expect(result.current.adStatus).toBe("loading");
      expect(result.current.isAdLoaded).toBe(false);
    });

    it("loaded 이벤트가 오면 ready 상태로 전환된다", () => {
      const { result } = renderHook(() => useFullScreenAd());

      act(() => {
        handlers.onEvent?.({ type: "loaded" });
      });

      expect(result.current.adStatus).toBe("ready");
      expect(result.current.isAdLoaded).toBe(true);
    });

    it("로드 타임아웃이 지나면 failed 상태로 전환된다", () => {
      const { result } = renderHook(() => useFullScreenAd());

      act(() => {
        vi.advanceTimersByTime(AD_LOAD_TIMEOUT_MS);
      });

      expect(result.current.adStatus).toBe("failed");
    });

    it("onError가 호출되면 failed 상태로 전환된다", () => {
      // 광고 로드 실패 시 console.error가 호출되므로 출력만 억제한다(복원은 afterEach).
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(() => useFullScreenAd());

      act(() => {
        handlers.onError?.(new Error("광고 인벤토리 없음"));
      });

      expect(result.current.adStatus).toBe("failed");
    });

    it("loaded 이후엔 타임아웃이 지나도 ready를 유지한다", () => {
      const { result } = renderHook(() => useFullScreenAd());

      act(() => {
        handlers.onEvent?.({ type: "loaded" });
      });
      act(() => {
        vi.advanceTimersByTime(AD_LOAD_TIMEOUT_MS);
      });

      expect(result.current.adStatus).toBe("ready");
    });

    it("reloadAd 호출 시 loading 상태로 되돌아간다", () => {
      const { result } = renderHook(() => useFullScreenAd());

      act(() => {
        vi.advanceTimersByTime(AD_LOAD_TIMEOUT_MS);
      });
      expect(result.current.adStatus).toBe("failed");

      act(() => {
        result.current.reloadAd();
      });

      expect(result.current.adStatus).toBe("loading");
    });
  });
});
