import { afterEach, describe, expect, it } from "vitest";
import { isTossBridgeAvailable } from "./bridge";

describe("토스 브리지 존재 판별", () => {
  afterEach(() => {
    delete (window as { ReactNativeWebView?: unknown }).ReactNativeWebView;
  });

  it("브리지가 없으면(일반 브라우저) false를 돌려준다", () => {
    expect(isTossBridgeAvailable()).toBe(false);
  });

  it("브리지가 주입돼 있으면(토스 앱 WebView) true를 돌려준다", () => {
    (window as { ReactNativeWebView?: unknown }).ReactNativeWebView = {};
    expect(isTossBridgeAvailable()).toBe(true);
  });
});
