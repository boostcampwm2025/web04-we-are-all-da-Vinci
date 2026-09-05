import { toError } from "../toError";
import { initSentry, isSentryActive, Sentry } from "./sentry";

export { isTossBridgeAvailable } from "./bridge";
export { AUTH_OBSERVABILITY_TAGS } from "./sentry";

export type ObservabilityLevel = "fatal" | "error" | "warning" | "info";

export interface CaptureContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
  level?: ObservabilityLevel;
}

// 같은 에러 객체가 레이어를 오르며(API → 훅 → 바운더리) 중복 보고되는 것을 막는다.
const reportedErrors = new WeakSet<object>();

const markReported = (error: unknown) => {
  if (typeof error === "object" && error !== null) reportedErrors.add(error);
};

export const isReportedError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && reportedErrors.has(error);

export const captureError = (
  error: unknown,
  context: CaptureContext = {},
): void => {
  if (isReportedError(error)) return;
  markReported(error);
  const normalized = toError(error, `원인 미상 에러: ${String(error)}`);
  if (isSentryActive()) {
    Sentry.captureException(normalized, {
      level: context.level ?? "error",
      tags: context.tags,
      extra: context.extra,
      fingerprint: context.fingerprint,
    });
  } else {
    // DSN 미설정(로컬·샌드박스)에서도 디버깅이 되도록 구조화 로그는 남긴다.
    console.error("[observability]", normalized, context);
  }
};

export const captureWarning = (
  message: string,
  context: CaptureContext = {},
): void => {
  if (isSentryActive()) {
    Sentry.captureMessage(message, {
      level: context.level ?? "warning",
      tags: context.tags,
      extra: context.extra,
      fingerprint: context.fingerprint,
    });
  } else {
    console.warn("[observability]", message, context);
  }
};

/**
 * 리플레이·에러 타임라인에 단계 표시를 남긴다. 에러가 났을 때 "어느 단계까지 갔는지"를 보여주는 용도라
 * 값(토큰·인가 코드)은 절대 넣지 않는다. Sentry가 비활성이면 no-op.
 */
export const leaveBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, string | number | boolean>,
): void => {
  if (!isSentryActive()) return;
  Sentry.addBreadcrumb({ category, message, data, level: "info" });
};

/** getAnonymousHash() 결과를 넣는다 — 앱인토스 콘솔의 anonymous_key와 같은 축이라 교차 조회가 된다. */
export const setObservabilityUser = (hash: string): void => {
  if (isSentryActive()) Sentry.setUser({ id: hash });
};

export const initObservability = (): void => {
  const sentryActive = initSentry();
  // Sentry가 살아 있으면 자체 전역 핸들러가 window error/rejection을 잡는다.
  // 없을 때만 직접 달아 전역 에러가 최소한 구조화 로그로는 남게 한다.
  if (!sentryActive && typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      captureError(event.error ?? event.message, {
        tags: { error_type: "window_error" },
      });
    });
    window.addEventListener("unhandledrejection", (event) => {
      captureError(event.reason, {
        tags: { error_type: "unhandled_rejection" },
      });
    });
  }
};
