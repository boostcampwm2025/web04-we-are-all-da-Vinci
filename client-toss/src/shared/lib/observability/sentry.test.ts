import * as Sentry from "@sentry/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initSentry, parseSampleRate, shouldReplayOnError } from "./sentry";

describe("Sentry 초기화", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("리플레이 정책 헬퍼", () => {
    it("error/fatal은 전부 리플레이를 보내고, 일반 warning(4xx 흡수 등)은 보내지 않는다", () => {
      expect(shouldReplayOnError({ level: "error" } as never)).toBe(true);
      expect(shouldReplayOnError({ level: "fatal" } as never)).toBe(true);
      expect(shouldReplayOnError({} as never)).toBe(true);
      expect(shouldReplayOnError({ level: "warning" } as never)).toBe(false);
      expect(shouldReplayOnError({ level: "info" } as never)).toBe(false);
    });

    it("로그인 도메인(auth 태그)은 warning이어도 리플레이를 보낸다", () => {
      expect(
        shouldReplayOnError({
          level: "warning",
          tags: { domain: "auth", error_type: "http_error" },
        } as never),
      ).toBe(true);
      expect(
        shouldReplayOnError({
          level: "warning",
          tags: { domain: "ranking" },
        } as never),
      ).toBe(false);
    });

    it("전체 세션 녹화 비율은 0~1만 받고 비었거나 범위 밖이면 기본값이다", () => {
      expect(parseSampleRate(undefined, 0)).toBe(0);
      expect(parseSampleRate("", 0)).toBe(0);
      expect(parseSampleRate("0.25", 0)).toBe(0.25);
      expect(parseSampleRate("1", 0)).toBe(1);
      expect(parseSampleRate("7", 0)).toBe(0);
      expect(parseSampleRate("abc", 0)).toBe(0);
    });
  });

  // initSentry는 모듈 스코프 플래그로 1회만 초기화한다 — 아래 세 케이스는 순서에 의존한다.
  it("DSN이 없으면 초기화하지 않는다", () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");

    expect(initSentry()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("DSN이 있으면 에러 세션만 리플레이를 보내는 설정으로 초기화한다", () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@o0.ingest.sentry.io/0");
    vi.stubEnv("VITE_SENTRY_REPLAY_SESSION_RATE", "");

    expect(initSentry()).toBe(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1,
        sendDefaultPii: false,
        tracesSampleRate: 0,
      }),
    );
    expect(Sentry.replayIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        beforeErrorSampling: shouldReplayOnError,
      }),
    );
  });

  it("두 번 불러도 한 번만 초기화한다", () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@o0.ingest.sentry.io/0");

    expect(initSentry()).toBe(true);
    expect(Sentry.init).not.toHaveBeenCalled();
  });
});
