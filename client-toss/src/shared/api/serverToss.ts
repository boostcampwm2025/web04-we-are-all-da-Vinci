import type { MyRankingResponse, RankingListItem } from "@/entities/ranking";
import {
  type AuthLoginStage,
  reportAuthLoginAttempt,
  reportAuthLoginFailure,
  reportAuthLoginSuccess,
} from "@/shared/lib";
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

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const LOGIN_PATH = "/oauth/toss/login";

const getToken = () => localStorage.getItem("access_token");

// 토큰이 바뀌면 다른 사용자일 수 있으므로 userKey/nickname 캐시도 함께 무효화한다.
export const setAccessToken = (token: string) => {
  localStorage.setItem("access_token", token);
  localStorage.removeItem("userKey");
  localStorage.removeItem("nickname");
};

export const clearAccessToken = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("userKey");
  localStorage.removeItem("nickname");
};

export const setCachedNickname = (nickname: string) =>
  localStorage.setItem("nickname", nickname);

let reissuePromise: Promise<string> | null = null;

/** 연속 실패 회차. 성공하면 0으로 돌아간다 — 재시도가 실제로 통하는지 보려는 값. */
let reissueAttempt = 0;

async function reissueToken(): Promise<string> {
  if (reissuePromise) return reissuePromise;
  reissuePromise = (async () => {
    // 최초 로그인(토큰 없음)과 만료 재발급은 실패 양상이 다르므로 구분해 기록한다.
    const isFirstLogin = getToken() === null;
    const attempt = ++reissueAttempt;
    const startedAt = Date.now();
    let stage: AuthLoginStage = "app_login";
    let httpStatus: number | undefined;

    reportAuthLoginAttempt({ isFirstLogin, attempt });

    try {
      const { authorizationCode, referrer } = await appLogin();

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

      setAccessToken(parsed.data.accessToken);
      setCachedNickname(parsed.data.nickname);
      reissueAttempt = 0;
      reportAuthLoginSuccess({
        isFirstLogin,
        attempt,
        elapsedMs: Date.now() - startedAt,
      });
      return parsed.data.accessToken;
    } catch (error) {
      // 리포트를 await하지 않는다 — 진단 때문에 에러 전파가 늦어지면 안 된다.
      void reportAuthLoginFailure({
        isFirstLogin,
        attempt,
        elapsedMs: Date.now() - startedAt,
        stage,
        error,
        httpStatus,
      });
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

export class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RequestError";
  }
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
  const makeHeaders = (token: string | null) => {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "no-cache");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };

  const fetchOnce = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: makeHeaders(token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
      cache: "no-store",
    });

  let response = await fetchOnce(getToken());

  // 로그인 엔드포인트는 재시도 안 함 (무한 루프 방지)
  if (response.status === 401 && path !== LOGIN_PATH) {
    const newToken = await reissueToken();
    response = await fetchOnce(newToken);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new RequestError(
      response.status,
      (error as { message?: string }).message ?? "요청 실패",
    );
  }

  // 204 No Content 등 body 없는 응답 처리
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const getCurrentUserKey = async () => {
  const storedUserKey = localStorage.getItem("userKey");
  if (storedUserKey) return storedUserKey;

  const userInfo = UserInfoResponseSchema.parse(
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
    NotificationAgreementResponseSchema.parse(
      await request<unknown>("GET", path, undefined, options),
    ),
  save: async (body: NotificationAgreementRequest) =>
    NotificationAgreementResponseSchema.parse(
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
    LoginResponseSchema.parse(await request<unknown>("POST", LOGIN_PATH, body)),

  logout: () => request<void>("POST", "/oauth/toss/logout"),

  getMe: async (options?: RequestOptions) =>
    UserInfoResponseSchema.parse(
      await request<unknown>("GET", "/user/me", undefined, options),
    ),

  startPlay: async () =>
    PromptResponseSchema.parse(await request<unknown>("POST", "/plays/start")),

  scoreStrokes: async (body: SubmitStrokesRequest) =>
    SimilarityResponseSchema.parse(
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
    PodiumResponseSchema.parse(await get<unknown>("/rankings/podium", options)),

  getDrawing: (drawingId: string, options?: RequestOptions) =>
    get<DrawingDetailResponse>(`/drawing/${drawingId}`, options),

  getArchiveSummary: async (
    options?: RequestOptions,
  ): Promise<ArchiveSummaryResponse> =>
    ArchiveSummaryResponseSchema.parse(
      await get<unknown>("/archive/summary", options),
    ),

  getArchiveDay: async (
    date: string,
    options?: RequestOptions,
  ): Promise<ArchiveDayResponse> =>
    ArchiveDayResponseSchema.parse(
      await get<unknown>(`/archive/days/${date}`, options),
    ),

  submitDrawing: async (strokes: Stroke[]) => {
    const userKey = await getCurrentUserKey();
    return SubmitDrawingResponseSchema.parse(
      await request<unknown>("POST", "/drawing", { userKey, strokes }),
    );
  },

  getMyChance: async (options?: RequestOptions) =>
    MyChanceResponseSchema.parse(
      await request<unknown>("GET", "/chances/me", undefined, options),
    ),

  getDailyPromptNotificationAgreement: dailyPromptAgreement.get,
  saveDailyPromptNotificationAgreement: dailyPromptAgreement.save,

  getOvertakenNotificationAgreement: overtakenAgreement.get,
  saveOvertakenNotificationAgreement: overtakenAgreement.save,

  getAttendanceStreakNotificationAgreement: attendanceStreakAgreement.get,
  saveAttendanceStreakNotificationAgreement: attendanceStreakAgreement.save,

  chargeChanceByAd: async (sdkPayload: AdSdkPayload) =>
    ChargeResponseSchema.parse(
      await request<unknown>("POST", "/chances/charge", {
        source: "ad",
        sdkPayload,
      }),
    ),

  chargeChanceByShare: async (sdkPayload: ShareSdkPayload) =>
    ChargeResponseSchema.parse(
      await request<unknown>("POST", "/chances/charge", {
        source: "share",
        sdkPayload,
      }),
    ),

  getMyMissions: async (options?: RequestOptions) =>
    MyMissionsResponseSchema.parse(
      await request<unknown>("GET", "/missions/me", undefined, options),
    ),

  getTodayMissions: async (options?: RequestOptions) =>
    TodayMissionsResponseSchema.parse(
      await request<unknown>("GET", "/missions/today", undefined, options),
    ),

  assignMyMissions: async (options?: RequestOptions) =>
    MyMissionsResponseSchema.parse(
      await request<unknown>("POST", "/missions/me", undefined, options),
    ),

  reportMissionAction: (actionType: MissionAction["actionType"]) =>
    request<void>("POST", "/missions/action", { actionType }),

  getAttendanceStatus: async (options?: RequestOptions) =>
    AttendanceStatusResponseSchema.parse(
      await request<unknown>("GET", "/attendance/me", undefined, options),
    ),

  checkInAttendance: async () =>
    AttendanceCheckInResponseSchema.parse(
      await request<unknown>("POST", "/attendance/check-in"),
    ),

  recoverAttendance: async (sdkPayload: AdSdkPayload) =>
    AttendanceRecoverResponseSchema.parse(
      await request<unknown>("POST", "/attendance/recover", { sdkPayload }),
    ),

  declineAttendanceRecovery: async () =>
    AttendanceStatusResponseSchema.parse(
      await request<unknown>("POST", "/attendance/decline"),
    ),

  getPointSummary: async (options?: RequestOptions) =>
    PointSummaryResponseSchema.parse(
      await request<unknown>("GET", "/points/me", undefined, options),
    ),
};
