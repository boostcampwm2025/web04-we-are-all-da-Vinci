import {
  RequestError,
  hasAccessToken,
  serverTossApi,
  setAccessToken,
  setCachedNickname,
} from "@/shared/api";
import {
  AUTH_OBSERVABILITY_TAGS,
  type AuthLoginSource,
  type AuthLoginStage,
  FUNNEL_EVENTS,
  captureError,
  getErrorMessage,
  isTossBridgeAvailable,
  leaveBreadcrumb,
  reportAuthLoginAttempt,
  reportAuthLoginFailure,
  reportAuthLoginSuccess,
  startSheetProbe,
  toError,
  trackClick,
  useInFlight,
} from "@/shared/lib";
import { appLogin } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LOGIN_PENDING_KEY,
  MAX_PENDING_AUTO_RETRIES,
} from "../config/constants";
import {
  LOGIN_FAILURE_MESSAGES,
  type LoginFailureKind,
} from "../config/loginMessages";
import {
  incrementLoginAttempt,
  readLoginAttempt,
  resetLoginAttempt,
} from "../model/loginAttemptStore";

/** 이 훅이 부르는 경로. 401 재발급(reissue)은 shared/api가 따로 보고한다. */
type LoginViewSource = Extract<AuthLoginSource, "login_view" | "pending_retry">;

interface FailureContext {
  stage: AuthLoginStage;
  attempt: number;
  isFirstLogin: boolean;
  source: LoginViewSource;
}

/** 토스 네이티브 에러는 name이 "Error"인 채 메시지에만 코드가 실릴 수 있어 태그로 따로 뽑는다. */
const extractErrorCode = (message: string): string | undefined =>
  /\b[A-Z][A-Z_]{5,}\b/.exec(message)?.[0];

const reportLoginFailure = (
  err: unknown,
  { stage, attempt, isFirstLogin, source }: FailureContext,
) => {
  const commonTags = {
    ...AUTH_OBSERVABILITY_TAGS,
    stage,
    is_first_login: isFirstLogin,
    attempt,
    source,
  };
  const original = getErrorMessage(err);

  // 브리지 부재(토스 앱 밖 진입)는 다른 로그인 실패와 완전히 다른 문제라 따로 그룹핑한다.
  if (!isTossBridgeAvailable()) {
    const error = toError(err, "토스 브리지 부재");
    captureError(error, {
      tags: {
        ...commonTags,
        error_type: "bridge_missing",
        error_name: error.name,
      },
      fingerprint: ["bridge-missing"],
      extra: { original },
    });
    trackClick(FUNNEL_EVENTS.bridgeMissing, { source, attempt });
    return;
  }

  const error = toError(err, "로그인 실패");
  const errorCode = extractErrorCode(original);
  // 단계·에러명으로 이슈를 가른다. 같은 에러의 연속 재시도는 Sentry Dedupe가 접으므로
  // 재시도 횟수는 GA4 auth_login_*의 attempt로 센다.
  captureError(error, {
    tags: {
      ...commonTags,
      error_type: "login_failed",
      error_name: error.name,
      ...(errorCode ? { error_code: errorCode } : {}),
    },
    fingerprint: ["login-failed", stage, error.name],
    extra: { original, source, attempt },
  });
  trackClick(FUNNEL_EVENTS.loginFailed, {
    reason: original,
    stage,
    source,
    attempt,
  });
};

/** 서버 단계 실패를 세분한다. serverTossApi.login이 파싱까지 안에서 끝내므로 catch에서 판별한다. */
const classifyServerFailure = (
  err: unknown,
): { stage: AuthLoginStage; httpStatus?: number } => {
  if (err instanceof RequestError) {
    return { stage: "token_issue", httpStatus: err.status };
  }
  if (err instanceof Error && err.name === "ZodError") {
    return { stage: "response_schema" };
  }
  return { stage: "token_issue" };
};

export const useLoginFlow = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 이번 세션의 누적 실패 회차. 동의 시트 리로드를 넘겨 이어진다.
  const [attempt, setAttempt] = useState(readLoginAttempt);
  // 더블탭 방지 — isLoading은 다음 렌더에야 반영돼 같은 사이클의 두 번째 탭을 못 막는다.
  const guard = useInFlight<void>();
  const pendingRetryFiredRef = useRef(false);

  const performLogin = useCallback(
    (source: LoginViewSource) =>
      guard(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        const currentAttempt = incrementLoginAttempt();
        setAttempt(currentAttempt);
        const isFirstLogin = !hasAccessToken();
        const startedAt = Date.now();
        let stage: AuthLoginStage = "app_login";

        reportAuthLoginAttempt({
          isFirstLogin,
          attempt: currentAttempt,
          source,
        });
        // 리플레이 타임라인용 단계 표시 — 로그인 실패 리플레이에서 브리지/서버 중 어디서 멈췄는지 보인다.
        leaveBreadcrumb("auth", "로그인 시작", {
          source,
          attempt: currentAttempt,
          bridge_available: isTossBridgeAvailable(),
        });
        // 동의 시트가 WebView를 리로드하면 이 플래그로 복귀를 알아보고 자동 재시도한다.
        localStorage.setItem(LOGIN_PENDING_KEY, "true");
        // appLogin() 동안 WebView가 가려졌는지(동의 시트가 실제로 떴는지) 기록한다.
        const probe = startSheetProbe();

        try {
          const { authorizationCode, referrer } = await appLogin();
          const sheet = probe.stop();
          leaveBreadcrumb("auth", "토스 인가 코드 수신", { referrer, source });
          localStorage.removeItem(LOGIN_PENDING_KEY);

          stage = "token_issue";
          const { accessToken, nickname } = await serverTossApi.login({
            authorizationCode,
            referrer,
          });
          leaveBreadcrumb("auth", "서버 로그인 성공");
          setAccessToken(accessToken);
          setCachedNickname(nickname);
          resetLoginAttempt();
          setAttempt(0);
          reportAuthLoginSuccess({
            isFirstLogin,
            attempt: currentAttempt,
            source,
            elapsedMs: Date.now() - startedAt,
            sheet,
          });
          navigate("/", { replace: true });
        } catch (err) {
          const sheet = probe.stop();
          localStorage.removeItem(LOGIN_PENDING_KEY);
          let httpStatus: number | undefined;
          if (stage !== "app_login") {
            const classified = classifyServerFailure(err);
            stage = classified.stage;
            httpStatus = classified.httpStatus;
          }
          // 리포트를 await하지 않는다 — 진단 때문에 화면 복구가 늦어지면 안 된다.
          void reportAuthLoginFailure({
            isFirstLogin,
            attempt: currentAttempt,
            source,
            elapsedMs: Date.now() - startedAt,
            stage,
            error: err,
            httpStatus,
            sheet,
          });
          reportLoginFailure(err, {
            stage,
            attempt: currentAttempt,
            isFirstLogin,
            source,
          });
          const kind: LoginFailureKind = isTossBridgeAvailable()
            ? stage
            : "bridge_missing";
          setErrorMessage(LOGIN_FAILURE_MESSAGES[kind]);
          console.error("[login error]", err);
        } finally {
          setIsLoading(false);
        }
      }),
    [guard, navigate],
  );

  useEffect(() => {
    if (hasAccessToken()) {
      navigate("/", { replace: true });
      return;
    }
    if (localStorage.getItem(LOGIN_PENDING_KEY) !== "true") return;
    // StrictMode 이중 effect에도 자동 재시도는 마운트당 1회만.
    if (pendingRetryFiredRef.current) return;
    pendingRetryFiredRef.current = true;
    localStorage.removeItem(LOGIN_PENDING_KEY);

    // 약관 동의 후 WebView가 리로드되어 돌아온 경우 자동으로 로그인 재시도.
    // 재시도가 다시 리로드를 부르는 루프를 끊는다 — 상한을 넘으면 사용자가 직접 누르게 둔다.
    if (readLoginAttempt() >= MAX_PENDING_AUTO_RETRIES) {
      setErrorMessage(LOGIN_FAILURE_MESSAGES.app_login);
      return;
    }
    leaveBreadcrumb("auth", "약관 동의 복귀 자동 재시도", {
      attempt: readLoginAttempt() + 1,
    });
    void performLogin("pending_retry");
  }, [navigate, performLogin]);

  const handleLogin = useCallback(() => {
    void performLogin("login_view");
  }, [performLogin]);

  return {
    handleLogin,
    isLoading,
    errorMessage,
    attempt,
  };
};
