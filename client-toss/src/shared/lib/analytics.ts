import { Analytics } from "@apps-in-toss/web-framework";

const trackAnalyticsError = () => {
  try {
    Analytics.click({ log_name: "analytics_error" });
  } catch {
    // SDK 자체가 완전히 망가진 경우 — 조용히 무시
  }
};

export const trackClick = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  try {
    Analytics.click({ ...params, log_name: logName });
  } catch {
    trackAnalyticsError();
  }
};

export const trackImpression = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  try {
    Analytics.impression({ ...params, log_name: logName });
  } catch {
    trackAnalyticsError();
  }
};

export const trackScreen = (
  logName: string,
  params?: Record<string, unknown>,
) => {
  try {
    Analytics.screen({ ...params, log_name: logName });
  } catch {
    trackAnalyticsError();
  }
};
