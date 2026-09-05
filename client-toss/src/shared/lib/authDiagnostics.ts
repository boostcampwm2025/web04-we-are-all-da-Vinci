import {
  getIsTossLoginIntegratedService,
  getNetworkStatus,
  getOperationalEnvironment,
  getPlatformOS,
  getTossAppVersion,
} from "@apps-in-toss/web-framework";
import { trackClick } from "./analytics";
import { FUNNEL_EVENTS } from "./funnelEvents";
import { getErrorMessage } from "./getErrorMessage";
import type { SheetProbeResult } from "./loginSheetProbe";

/**
 * 로그인이 어느 단계에서 끝났는지. 실패 원인을 SDK / 서버 / 응답으로 확인.
 * - app_login: `appLogin()`이 인가 코드를 못 준 경우 (SDK·브리지 문제)
 * - token_issue: 서버 `POST /oauth/toss/login`이 실패한 경우
 * - response_schema: 응답이 스키마와 다른 경우
 */
export type AuthLoginStage = "app_login" | "token_issue" | "response_schema";

/**
 * 로그인을 부른 경로. 실패율을 경로별로 갈라 보기 위한 축.
 * - login_view: LoginView에서 사용자가 버튼을 눌렀다
 * - pending_retry: 동의 시트 뒤 WebView 리로드로 돌아와 자동 재시도했다
 * - reissue: 401 재발급(`request()` 안)에서 불렀다
 */
export type AuthLoginSource = "login_view" | "pending_retry" | "reissue";

/** 시트 관측 결과를 GA4 파라미터로 편다. 관측이 없으면 키 자체를 싣지 않는다. */
const sheetParams = (sheet?: SheetProbeResult) =>
  sheet
    ? {
        sheet_shown: sheet.sheetShown,
        sheet_hidden_ms: sheet.hiddenMs,
        visibility_transitions: sheet.transitions,
      }
    : {};

const SDK_READ_TIMEOUT_MS = 1000;

const safeSync = <T>(read: () => T): T | undefined => {
  try {
    return read();
  } catch {
    return undefined;
  }
};

const safeAsync = async <T>(read: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await Promise.race([
      read(),
      new Promise<undefined>((resolve) => {
        setTimeout(() => resolve(undefined), SDK_READ_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return undefined;
  }
};

/** 동기 조회만 — 비용이 없어 attempt/success에도 붙인다. */
const collectSyncContext = () => ({
  platform_os: safeSync(getPlatformOS),
  toss_app_version: safeSync(getTossAppVersion),
  operational_environment: safeSync(getOperationalEnvironment),
});

/**
 * 비동기 조회 포함 — 실패 시에만 쓴다. 이미 실패한 뒤라 최대 1초 지연은
 * 사용자 경험에 영향이 없고, network_status가 "1초 이내 즉시 실패"의
 * 원인을 가를 핵심 단서다.
 */
const collectFullContext = async () => {
  const [networkStatus, isLoginIntegrated] = await Promise.all([
    safeAsync(getNetworkStatus),
    safeAsync(getIsTossLoginIntegratedService),
  ]);

  return {
    ...collectSyncContext(),
    network_status: networkStatus,
    is_login_integrated: isLoginIntegrated,
  };
};

interface AuthLoginBase {
  /** 시도 시점에 토큰이 없었는가 = 최초 로그인인가 */
  isFirstLogin: boolean;
  /**
   * 연속 실패 회차. 성공하면 리셋된다.
   * login_view·pending_retry는 sessionStorage 누적(동의 시트 리로드를 넘김), reissue는 메모리 누적이다.
   */
  attempt: number;
  /** 로그인을 부른 경로 */
  source: AuthLoginSource;
}

export const reportAuthLoginAttempt = ({
  isFirstLogin,
  attempt,
  source,
}: AuthLoginBase) => {
  trackClick(FUNNEL_EVENTS.authLoginAttempt, {
    ...collectSyncContext(),
    is_first_login: isFirstLogin,
    attempt,
    source,
  });
};

export const reportAuthLoginSuccess = ({
  isFirstLogin,
  attempt,
  source,
  elapsedMs,
  sheet,
}: AuthLoginBase & { elapsedMs: number; sheet?: SheetProbeResult }) => {
  trackClick(FUNNEL_EVENTS.authLoginSuccess, {
    ...collectSyncContext(),
    ...sheetParams(sheet),
    is_first_login: isFirstLogin,
    attempt,
    source,
    elapsed_ms: elapsedMs,
  });
};

/**
 * 실패 리포트는 호출부의 에러 전파를 막지 않아야 하므로 await하지 않고 쓴다.
 * 내부에서 절대 throw하지 않는다 — 진단이 원래 에러를 가리면 안 된다.
 */
export const reportAuthLoginFailure = async ({
  isFirstLogin,
  attempt,
  source,
  elapsedMs,
  stage,
  error,
  httpStatus,
  sheet,
}: AuthLoginBase & {
  elapsedMs: number;
  stage: AuthLoginStage;
  error: unknown;
  httpStatus?: number;
  sheet?: SheetProbeResult;
}): Promise<void> => {
  try {
    const context = await collectFullContext();
    trackClick(FUNNEL_EVENTS.authLoginFailed, {
      ...context,
      ...sheetParams(sheet),
      is_first_login: isFirstLogin,
      attempt,
      source,
      elapsed_ms: elapsedMs,
      stage,
      http_status: httpStatus,
      error_name: error instanceof Error ? error.name : typeof error,
      error_message: getErrorMessage(error),
    });
  } catch {
    // 진단 수집 자체가 실패해도 조용히 넘어간다.
  }
};
