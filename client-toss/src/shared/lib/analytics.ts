import { Analytics } from "@apps-in-toss/web-framework";

export const trackClick = (logName: string, params?: Record<string, unknown>) =>
  Analytics.click({ log_name: logName, ...params });

export const trackImpression = (
  logName: string,
  params?: Record<string, unknown>,
) => Analytics.impression({ log_name: logName, ...params });

export const trackScreen = (
  logName: string,
  params?: Record<string, unknown>,
) => Analytics.screen({ log_name: logName, ...params });
