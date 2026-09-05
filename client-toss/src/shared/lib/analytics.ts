import { getAnalyticsInstance } from "@/shared/api/firebase";
import { Analytics as TossAnalytics } from "@apps-in-toss/web-framework";
import { logEvent } from "firebase/analytics";
import { captureWarning } from "./observability";

// 계측 전송 실패는 세션당 1회만 보고한다 — 한번 깨지면 모든 호출이 깨져 스팸이 된다.
// 관측 경로(Sentry)와 계측 경로(Analytics)가 분리돼 있어 재귀 보고는 없다.
let tossFailureReported = false;
let firebaseFailureReported = false;

const reportTossFailure = (error: unknown, logName: string) => {
  if (tossFailureReported) return;
  tossFailureReported = true;
  captureWarning("토스 계측 전송 실패", {
    tags: { error_type: "analytics_send_failed", sdk: "toss" },
    extra: { logName, original: String(error) },
  });
};

const trackAnalyticsError = () => {
  try {
    TossAnalytics.click({ log_name: "analytics_error" });
  } catch {
    // 토스 SDK 자체가 완전히 망가진 경우 — 여기까지 오면 더 보낼 곳이 없다
  }
};

const fanOutToFirebase = (
  eventName: string,
  params?: Record<string, unknown>,
) => {
  try {
    const fa = getAnalyticsInstance();
    if (!fa) return;
    logEvent(fa, eventName, params);
  } catch (error) {
    // Firebase 실패는 토스 로깅 흐름을 막지 않되, 실패 사실은 남긴다
    if (firebaseFailureReported) return;
    firebaseFailureReported = true;
    captureWarning("Firebase 계측 전송 실패", {
      tags: { error_type: "analytics_send_failed", sdk: "firebase" },
      extra: { eventName, original: String(error) },
    });
  }
};

const sanitizeParams = (params?: Record<string, unknown>) => {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null),
  );
};

export const trackClick = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  const analyticsParams = sanitizeParams(params);
  try {
    TossAnalytics.click({ ...analyticsParams, log_name: logName });
  } catch (error) {
    reportTossFailure(error, logName);
    trackAnalyticsError();
  }
  fanOutToFirebase(logName, analyticsParams);
};

export const trackImpression = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  const analyticsParams = sanitizeParams(params);
  try {
    TossAnalytics.impression({ ...analyticsParams, log_name: logName });
  } catch (error) {
    reportTossFailure(error, logName);
    trackAnalyticsError();
  }
  fanOutToFirebase(logName, analyticsParams);
};

export const trackScreen = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  const analyticsParams = sanitizeParams(params);
  try {
    TossAnalytics.screen({ ...analyticsParams, log_name: logName });
  } catch (error) {
    reportTossFailure(error, logName);
    trackAnalyticsError();
  }
  fanOutToFirebase(logName, analyticsParams);
};
