import { Analytics as TossAnalytics } from "@apps-in-toss/web-framework";
import { logEvent } from "firebase/analytics";
import { getAnalyticsInstance } from "@/shared/api";

const trackAnalyticsError = () => {
  try {
    TossAnalytics.click({ log_name: "analytics_error" });
  } catch {
    // 토스 SDK 자체가 완전히 망가진 경우 — 조용히 무시
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
  } catch {
    // Firebase 실패는 토스 로깅 흐름에 영향 주지 않도록 조용히 무시
  }
};

export const trackClick = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  try {
    TossAnalytics.click({ ...params, log_name: logName });
  } catch {
    trackAnalyticsError();
  }
  fanOutToFirebase(logName, params);
};

export const trackImpression = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  try {
    TossAnalytics.impression({ ...params, log_name: logName });
  } catch {
    trackAnalyticsError();
  }
  fanOutToFirebase(logName, params);
};

export const trackScreen = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  try {
    TossAnalytics.screen({ ...params, log_name: logName });
  } catch {
    trackAnalyticsError();
  }
  fanOutToFirebase(logName, params);
};
