import * as Sentry from "@sentry/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureError, isReportedError } from "./index";

// vitest.setup.ts가 @sentry/react를 목으로 바꾼다. DSN이 없어 Sentry는 비활성 상태이므로
// 여기서는 전송이 아니라 중복 제거(WeakSet) 계약을 검증한다.
describe("에러 보고 중복 제거", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("같은 에러 객체는 한 번만 보고된다", () => {
    const error = new Error("중복 보고 테스트");
    captureError(error);
    captureError(error);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("보고된 에러는 isReportedError로 판별된다", () => {
    const error = new Error("판별 테스트");
    expect(isReportedError(error)).toBe(false);
    captureError(error);
    expect(isReportedError(error)).toBe(true);
  });

  it("서로 다른 에러 객체는 각각 보고된다", () => {
    captureError(new Error("첫 번째"));
    captureError(new Error("두 번째"));
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it("Sentry가 비활성이면 captureException을 호출하지 않는다", () => {
    captureError(new Error("비활성 테스트"));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
