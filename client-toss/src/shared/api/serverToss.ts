import type { MyRankingResponse, RankingListItem } from "@/entities/ranking";
import {
  AUTH_OBSERVABILITY_TAGS,
  type AuthLoginStage,
  captureError,
  getErrorMessage,
  isTossBridgeAvailable,
  leaveBreadcrumb,
  reportAuthLoginAttempt,
  reportAuthLoginFailure,
  reportAuthLoginSuccess,
  startSheetProbe,
  toError,
} from "@/shared/lib";
import { RequestError } from "./requestError";
import { appLogin } from "@apps-in-toss/web-framework";
import type {
  AdSdkPayload,
  ArchiveDayResponse,
  ArchiveSummaryResponse,
  MyDrawingResponse,
  MissionAction,
  NotificationAgreementRequest,
  ShareSdkPayload,
  Stroke,
  SubmitStrokesRequest,
} from "@toss/shared";
import {
  ArchiveDayResponseSchema,
  ArchiveSummaryResponseSchema,
  AttendanceCheckInResponseSchema,
  AttendanceRecoverResponseSchema,
  AttendanceStatusResponseSchema,
  ChargeResponseSchema,
  LoginResponseSchema,
  MyChanceResponseSchema,
  MyMissionsResponseSchema,
  NotificationAgreementResponseSchema,
  PodiumResponseSchema,
  PointSummaryResponseSchema,
  PromptResponseSchema,
  SimilarityResponseSchema,
  SubmitDrawingResponseSchema,
  TodayMissionsResponseSchema,
  UserInfoResponseSchema,
} from "@toss/shared";
import { z } from "zod";

export { RequestError };

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const LOGIN_PATH = "/oauth/toss/login";

const getToken = () => localStorage.getItem("access_token");

/** 토큰 게이트용. 값 자체는 노출하지 않고 존재 여부만 돌려준다. */
export const hasAccessToken = () => getToken() !== null;

// 토큰이 바뀌면 다른 사용자일 수 있으므로 userKey/nickname 캐시도 함께 무효화한다.
export const setAccessToken = (token: string) => {
  localStorage.setItem("access_token", token);
  localStorage.removeItem("userKey");
  localStorage.removeItem("nickname");
};

// 세션(사용자) 경계 리스너 — app 레이어가 서버 상태 캐시(queryClient.clear)를 여기에 연결한다.
// shared → app 방향 import는 FSD 위반이라 콜백 등록으로 뒤집는다.
const sessionClearedListeners = new Set<() => void>();
export const onSessionCleared = (listener: () => void) => {
  sessionClearedListeners.add(listener);
  return () => {
    sessionClearedListeners.delete(listener);
  };
};

// 로그아웃·재발급 실패 = 사용자 경계. 메모리·디스크의 서버 상태 캐시를 함께 비운다.
// setAccessToken(401 재발급)에서는 부르지 않는다 — 같은 사용자이고, 화면에 떠 있는 쿼리가
// 요청 도중이라 캐시를 지우면 관측자가 파괴된 쿼리에 묶여 값이 사라진다.
export const clearAccessToken = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("userKey");
  localStorage.removeItem("nickname");
  sessionClearedListeners.forEach((listener) => listener());
};

export const setCachedNickname = (nickname: string) =>
  localStorage.setItem("nickname", nickname);

// dev 서버는 http(비보안 컨텍스트)라 crypto.randomUUID가 없을 수 있다 — 폴백 필수.
const generateRequestId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// 동적 세그먼트(id·날짜)를 접어 fingerprint 카디널리티 폭발을 막는다. 원본 path는 extra로 보낸다.
const normalizePath = (path: string): string =>
  path
    .replace(/\/\d{4}-\d{2}-\d{2}(?=\/|$)/g, "/:date")
    .replace(/\/(\d+|[0-9a-f-]{16,})(?=\/|$)/gi, "/:id");

let reissuePromise: Promise<string> | null = null;

/** 연속 실패 회차. 성공하면 0으로 돌아간다 — 재시도가 실제로 통하는지 보려는 값. */
let reissueAttempt = 0;

// GA 퍼널(reportAuthLogin*)과 별개로 Sentry에도 보고한다 — 리플레이·브레드크럼이 여기에 붙는다.
const reportReissueFailure = (
  err: unknown,
  stage: AuthLoginStage,
  { attempt, isFirstLogin }: { attempt: number; isFirstLogin: boolean },
) => {
  const commonTags = {
    ...AUTH_OBSERVABILITY_TAGS,
    stage,
    is_first_login: isFirstLogin,
    attempt,
    source: "reissue",
  };
  // 브리지 부재(토스 앱 밖 진입)는 다른 재발급 실패와 완전히 다른 문제라 따로 그룹핑한다.
  if (!isTossBridgeAvailable()) {
    const error = toError(err, "토스 브리지 부재");
    captureError(error, {
      tags: {
        ...commonTags,
        error_type: "bridge_missing",
        error_name: error.name,
      },
      fingerprint: ["bridge-missing"],
      extra: { phase: "token_reissue", stage, original: getErrorMessage(err) },
    });
    return;
  }
  const error = toError(err, "토큰 재발급 실패");
  // 단계·에러명(토스 네이티브 코드)으로 이슈를 가른다. 같은 에러의 연속 재시도는 Sentry Dedupe가 접으므로
  // 재시도 횟수는 GA4 auth_login_*의 attempt로 센다.
  captureError(error, {
    tags: {
      ...commonTags,
      error_type: "token_reissue_failed",
      error_name: error.name,
    },
    fingerprint: ["token-reissue-failed", stage, error.name],
    extra: { stage, original: getErrorMessage(err) },
  });
};

async function reissueToken(): Promise<string> {
  if (reissuePromise) return reissuePromise;
  reissuePromise = (async () => {
    // 최초 로그인(토큰 없음)과 만료 재발급은 실패 양상이 다르므로 구분해 기록한다.
    const isFirstLogin = getToken() === null;
    const attempt = ++reissueAttempt;
    const startedAt = Date.now();
    let stage: AuthLoginStage = "app_login";
    let httpStatus: number | undefined;

    reportAuthLoginAttempt({ isFirstLogin, attempt, source: "reissue" });
    leaveBreadcrumb("auth", "토큰 재발급 시작", { isFirstLogin, attempt });
    // appLogin() 동안 WebView가 가려졌는지(동의 시트가 실제로 떴는지) 기록한다.
    const probe = startSheetProbe();

    try {
      const { authorizationCode, referrer } = await appLogin();
      const sheet = probe.stop();
      leaveBreadcrumb("auth", "토큰 재발급 인가 코드 수신", { referrer });

      stage = "token_issue";
      const res = await fetch(`${BASE_URL}${LOGIN_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizationCode, referrer }),
      });
      httpStatus = res.status;
      if (!res.ok) {
        clearAccessToken();
        throw new Error("토큰 재발급 실패");
      }

      stage = "response_schema";
      const parsed = LoginResponseSchema.safeParse(await res.json());
      if (!parsed.success) {
        clearAccessToken();
        throw new Error("토큰 재발급 응답이 올바르지 않아요");
      }

      leaveBreadcrumb("auth", "토큰 재발급 성공");
      setAccessToken(parsed.data.accessToken);
      setCachedNickname(parsed.data.nickname);
      reissueAttempt = 0;
      reportAuthLoginSuccess({
        isFirstLogin,
        attempt,
        elapsedMs: Date.now() - startedAt,
        source: "reissue",
        sheet,
      });
      return parsed.data.accessToken;
    } catch (error) {
      const sheet = probe.stop();
      // 리포트를 await하지 않는다 — 진단 때문에 에러 전파가 늦어지면 안 된다.
      void reportAuthLoginFailure({
        isFirstLogin,
        attempt,
        elapsedMs: Date.now() - startedAt,
        stage,
        error,
        httpStatus,
        source: "reissue",
        sheet,
      });
      reportReissueFailure(error, stage, { attempt, isFirstLogin });
      throw error;
    }
  })().finally(() => {
    reissuePromise = null;
  });
  return reissuePromise;
}

interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
}

interface RankingListServerResponse {
  updatedAt: string;
  rankings: RankingListItem[];
}

type DrawingDetailResponse = MyDrawingResponse & {
  nickname: string;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const requestId = generateRequestId();
  const fingerprintPath = normalizePath(path);
  // 로그인 엔드포인트의 실패는 warning이어도 리플레이가 따라가도록 auth 도메인 태그를 붙인다.
  const domainTags = path === LOGIN_PATH ? AUTH_OBSERVABILITY_TAGS : {};

  const makeHeaders = (token: string | null) => {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-cache");
    // server-toss가 이 값을 모든 로그 라인에 붙이고 X-Request-Id로 되돌려준다.
    // 클라 에러 리포트의 requestId로 서버 로그를 바로 찾을 수 있다.
    headers.set("x-request-id", requestId);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };

  const fetchOnce = async (token: string | null) => {
    try {
      return await fetch(`${BASE_URL}${path}`, {
        method,
        headers: makeHeaders(token),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options.signal,
        cache: "no-store",
      });
    } catch (err) {
      // 언마운트로 인한 abort는 정상 흐름 — 보고하지 않는다.
      if (err instanceof Error && err.name === "AbortError") throw err;
      captureError(toError(err, "네트워크 요청 실패"), {
        tags: { ...domainTags, error_type: "fetch_error", method },
        fingerprint: ["api-fetch-error", fingerprintPath],
        extra: { path, requestId, original: getErrorMessage(err) },
      });
      throw err;
    }
  };

  let response = await fetchOnce(getToken());

  // 로그인 엔드포인트는 재시도 안 함 (무한 루프 방지)
  if (response.status === 401 && path !== LOGIN_PATH) {
    const newToken = await reissueToken();
    response = await fetchOnce(newToken);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const requestError = new RequestError(
      response.status,
      (errorBody as { message?: string }).message ?? "요청 실패",
    );
    // 401→재발급→재시도가 성공하면 여기 오지 않는다 — 최종 실패만 보고된다.
    // 4xx는 의도된 분기(409 멱등 흡수 등)가 섞여 있어 warning으로 낮춘다.
    captureError(requestError, {
      level: response.status >= 500 ? "error" : "warning",
      tags: {
        ...domainTags,
        error_type: "http_error",
        method,
        status: response.status,
      },
      fingerprint: ["api-http-error", String(response.status), fingerprintPath],
      extra: { path, requestId },
    });
    throw requestError;
  }

  // 204 No Content 등 body 없는 응답 처리
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// 스키마 불일치는 서버 계약 변경이 클라이언트를 조용히 깨뜨리는 신호 — 반드시 남긴다.
const parseResponse = <S extends z.ZodType>(
  schema: S,
  path: string,
  data: unknown,
): z.output<S> => {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  captureError(result.error, {
    tags: { error_type: "schema_mismatch" },
    fingerprint: ["api-schema-mismatch", path],
    extra: { path, issues: result.error.issues.slice(0, 5) },
  });
  throw result.error;
};

const getCurrentUserKey = async () => {
  const storedUserKey = localStorage.getItem("userKey");
  if (storedUserKey) return storedUserKey;

  const userInfo = parseResponse(
    UserInfoResponseSchema,
    "/user/me",
    await request<unknown>("GET", "/user/me"),
  );
  const userKey = String(userInfo.userKey);
  localStorage.setItem("userKey", userKey);
  return userKey;
};

const get = <T>(path: string, options: RequestOptions = {}): Promise<T> =>
  request<T>("GET", path, undefined, options);

// 알림 동의 GET/POST는 경로만 다르고 본문이 동일하다. 경로별로 get/save 쌍을 찍어내
// 중복을 없앤다. 공개 메서드명은 그대로 유지(소비처·테스트 영향 없음).
const makeAgreementApi = (path: string) => ({
  get: async (options?: RequestOptions) =>
    parseResponse(
      NotificationAgreementResponseSchema,
      path,
      await request<unknown>("GET", path, undefined, options),
    ),
  save: async (body: NotificationAgreementRequest) =>
    parseResponse(
      NotificationAgreementResponseSchema,
      path,
      await request<unknown>("POST", path, body),
    ),
});

const dailyPromptAgreement = makeAgreementApi(
  "/notifications/daily-prompt/agreement",
);
const overtakenAgreement = makeAgreementApi(
  "/notifications/overtaken/agreement",
);
const attendanceStreakAgreement = makeAgreementApi(
  "/notifications/attendance-streak/agreement",
);

export const serverTossApi = {
  login: async (body: {
    authorizationCode: string;
    referrer: "DEFAULT" | "SANDBOX";
  }) =>
    parseResponse(
      LoginResponseSchema,
      LOGIN_PATH,
      await request<unknown>("POST", LOGIN_PATH, body),
    ),

  logout: () => request<void>("POST", "/oauth/toss/logout"),

  getMe: async (options?: RequestOptions) =>
    parseResponse(
      UserInfoResponseSchema,
      "/user/me",
      await request<unknown>("GET", "/user/me", undefined, options),
    ),

  startPlay: async () =>
    parseResponse(
      PromptResponseSchema,
      "/plays/start",
      await request<unknown>("POST", "/plays/start"),
    ),

  scoreStrokes: async (body: SubmitStrokesRequest) =>
    parseResponse(
      SimilarityResponseSchema,
      "/strokes",
      await request<unknown>("POST", "/strokes", body),
    ),

  getMyRanking: (options?: RequestOptions) =>
    get<MyRankingResponse>("/rankings/me", options),

  getRankingList: async (options?: RequestOptions) => {
    const { rankings } = await get<RankingListServerResponse>(
      "/rankings",
      options,
    );
    return rankings;
  },

  getPodium: async (options?: RequestOptions) =>
    parseResponse(
      PodiumResponseSchema,
      "/rankings/podium",
      await get<unknown>("/rankings/podium", options),
    ),

  getDrawing: (drawingId: string, options?: RequestOptions) =>
    get<DrawingDetailResponse>(`/drawing/${drawingId}`, options),

  getArchiveSummary: async (
    options?: RequestOptions,
  ): Promise<ArchiveSummaryResponse> =>
    parseResponse(
      ArchiveSummaryResponseSchema,
      "/archive/summary",
      await get<unknown>("/archive/summary", options),
    ),

  getArchiveDay: async (
    date: string,
    options?: RequestOptions,
  ): Promise<ArchiveDayResponse> =>
    parseResponse(
      ArchiveDayResponseSchema,
      "/archive/days/:date",
      await get<unknown>(`/archive/days/${date}`, options),
    ),

  submitDrawing: async (strokes: Stroke[]) => {
    const userKey = await getCurrentUserKey();
    return parseResponse(
      SubmitDrawingResponseSchema,
      "/drawing",
      await request<unknown>("POST", "/drawing", { userKey, strokes }),
    );
  },

  getMyChance: async (options?: RequestOptions) =>
    parseResponse(
      MyChanceResponseSchema,
      "/chances/me",
      await request<unknown>("GET", "/chances/me", undefined, options),
    ),

  getDailyPromptNotificationAgreement: dailyPromptAgreement.get,
  saveDailyPromptNotificationAgreement: dailyPromptAgreement.save,

  getOvertakenNotificationAgreement: overtakenAgreement.get,
  saveOvertakenNotificationAgreement: overtakenAgreement.save,

  getAttendanceStreakNotificationAgreement: attendanceStreakAgreement.get,
  saveAttendanceStreakNotificationAgreement: attendanceStreakAgreement.save,

  chargeChanceByAd: async (sdkPayload: AdSdkPayload) =>
    parseResponse(
      ChargeResponseSchema,
      "/chances/charge",
      await request<unknown>("POST", "/chances/charge", {
        source: "ad",
        sdkPayload,
      }),
    ),

  chargeChanceByShare: async (sdkPayload: ShareSdkPayload) =>
    parseResponse(
      ChargeResponseSchema,
      "/chances/charge",
      await request<unknown>("POST", "/chances/charge", {
        source: "share",
        sdkPayload,
      }),
    ),

  getMyMissions: async (options?: RequestOptions) =>
    parseResponse(
      MyMissionsResponseSchema,
      "/missions/me",
      await request<unknown>("GET", "/missions/me", undefined, options),
    ),

  getTodayMissions: async (options?: RequestOptions) =>
    parseResponse(
      TodayMissionsResponseSchema,
      "/missions/today",
      await request<unknown>("GET", "/missions/today", undefined, options),
    ),

  assignMyMissions: async (options?: RequestOptions) =>
    parseResponse(
      MyMissionsResponseSchema,
      "/missions/me",
      await request<unknown>("POST", "/missions/me", undefined, options),
    ),

  reportMissionAction: (actionType: MissionAction["actionType"]) =>
    request<void>("POST", "/missions/action", { actionType }),

  getAttendanceStatus: async (options?: RequestOptions) =>
    parseResponse(
      AttendanceStatusResponseSchema,
      "/attendance/me",
      await request<unknown>("GET", "/attendance/me", undefined, options),
    ),

  checkInAttendance: async () =>
    parseResponse(
      AttendanceCheckInResponseSchema,
      "/attendance/check-in",
      await request<unknown>("POST", "/attendance/check-in"),
    ),

  recoverAttendance: async (sdkPayload: AdSdkPayload) =>
    parseResponse(
      AttendanceRecoverResponseSchema,
      "/attendance/recover",
      await request<unknown>("POST", "/attendance/recover", { sdkPayload }),
    ),

  declineAttendanceRecovery: async () =>
    parseResponse(
      AttendanceStatusResponseSchema,
      "/attendance/decline",
      await request<unknown>("POST", "/attendance/decline"),
    ),

  getPointSummary: async (options?: RequestOptions) =>
    parseResponse(
      PointSummaryResponseSchema,
      "/points/me",
      await request<unknown>("GET", "/points/me", undefined, options),
    ),
};
