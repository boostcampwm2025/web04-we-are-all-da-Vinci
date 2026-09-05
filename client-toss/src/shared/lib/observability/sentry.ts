import * as Sentry from "@sentry/react";
import { scrubDeep } from "./scrub";

let active = false;

/** 0~1 사이 비율만 받는다. 비어 있거나 범위 밖이면 fallback. */
export const parseSampleRate = (
  raw: string | undefined,
  fallback: number,
): number => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const rate = Number(raw);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : fallback;
};

/** 로그인·토큰 재발급 경로의 보고에 붙이는 태그. 이 태그가 있으면 warning이어도 리플레이를 보낸다. */
export const AUTH_OBSERVABILITY_TAGS = { domain: "auth" } as const;

/**
 * 리플레이 전송을 트리거하는 이벤트.
 * - error/fatal은 전부.
 * - warning은 로그인 도메인(`tags.domain === "auth"`)만 — 로그인은 실패가 4xx(warning)로 내려와도
 *   사용자가 앱에 못 들어오는 문제라 리플레이가 필요하다. 그 외 warning(409 멱등 흡수 등)은 쿼터를 쓰지 않는다.
 */
export const shouldReplayOnError = (event: Sentry.ErrorEvent): boolean => {
  if (
    event.level === undefined ||
    event.level === "error" ||
    event.level === "fatal"
  ) {
    return true;
  }
  return event.tags?.domain === AUTH_OBSERVABILITY_TAGS.domain;
};

/**
 * DSN이 없으면 조용히 no-op — firebase.ts의 초기화 관례와 동일.
 *
 * Session Replay는 **에러가 난 세션만** 보낸다(replaysOnErrorSampleRate=1): 에러 직전 약 1분의
 * 버퍼가 함께 올라가 "어떤 화면에서 무엇을 누르다 났는지"를 보여준다. 텍스트·입력은 전부 마스킹,
 * 미디어는 차단이라 닉네임·포인트 같은 값은 리플레이에 남지 않는다. 캔버스는 기본적으로 녹화되지 않는다.
 * 전체 세션 녹화는 VITE_SENTRY_REPLAY_SESSION_RATE(0~1, 기본 0)로 켠다 — 리플레이 쿼터를 빠르게 쓴다.
 * tracing은 붙이지 않는다.
 */
export const initSentry = (): boolean => {
  if (active) return true;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT ??
      (import.meta.env.DEV ? "development" : "production"),
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        beforeErrorSampling: shouldReplayOnError,
      }),
    ],
    replaysSessionSampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE,
      0,
    ),
    replaysOnErrorSampleRate: 1.0,
    beforeSend: (event) => scrubDeep(event),
    beforeBreadcrumb: (breadcrumb) => scrubDeep(breadcrumb),
  });
  active = true;
  return true;
};

export const isSentryActive = (): boolean => active;

export { Sentry };
