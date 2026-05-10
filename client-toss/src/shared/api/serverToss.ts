import type { PodiumEntry } from "@/entities/podium";
import type { MyRankingResponse, RankingListItem } from "@/entities/ranking";
import { appLogin } from "@apps-in-toss/web-framework";
import type {
  AdSdkPayload,
  MyDrawingResponse,
  MyDrawingsResponse,
  ShareSdkPayload,
  Stroke,
  SubmitStrokesRequest,
} from "@toss/shared";
import {
  ChargeResponseSchema,
  ConsumeResponseSchema,
  LoginResponseSchema,
  MyChanceResponseSchema,
  PromptResponseSchema,
  SimilarityResponseSchema,
  SubmitDrawingResponseSchema,
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

export const getCachedNickname = () => localStorage.getItem("nickname");
export const setCachedNickname = (nickname: string) =>
  localStorage.setItem("nickname", nickname);

let reissuePromise: Promise<string> | null = null;

async function reissueToken(): Promise<string> {
  if (reissuePromise) return reissuePromise;
  reissuePromise = (async () => {
    const { authorizationCode, referrer } = await appLogin();
    const res = await fetch(`${BASE_URL}${LOGIN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizationCode, referrer }),
    });
    if (!res.ok) {
      clearAccessToken();
      throw new Error("토큰 재발급 실패");
    }
    const parsed = LoginResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      clearAccessToken();
      throw new Error("토큰 재발급 응답이 올바르지 않아요");
    }
    setAccessToken(parsed.data.accessToken);
    setCachedNickname(parsed.data.nickname);
    return parsed.data.accessToken;
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

export const serverTossApi = {
  login: async (body: {
    authorizationCode: string;
    referrer: "DEFAULT" | "SANDBOX";
  }) =>
    LoginResponseSchema.parse(await request<unknown>("POST", LOGIN_PATH, body)),

  logout: () => request<void>("POST", "/oauth/toss/logout"),

  getMe: async () =>
    UserInfoResponseSchema.parse(await request<unknown>("GET", "/user/me")),

  getPrompt: async () =>
    PromptResponseSchema.parse(await request<unknown>("GET", "/prompt")),

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

  getPodium: (options?: RequestOptions) =>
    get<PodiumEntry[]>("/rankings/podium", options),

  getMyDrawings: (options?: RequestOptions) =>
    get<MyDrawingsResponse>("/drawing/me", options),

  getDrawing: (drawingId: string, options?: RequestOptions) =>
    get<DrawingDetailResponse>(`/drawing/${drawingId}`, options),

  submitDrawing: async (strokes: Stroke[]) => {
    const userKey = await getCurrentUserKey();
    return SubmitDrawingResponseSchema.parse(
      await request<unknown>("POST", "/drawing", { userKey, strokes }),
    );
  },

  recordAdView: () => request<void>("POST", "/adviews"),

  getMyChance: async (options?: RequestOptions) =>
    MyChanceResponseSchema.parse(
      await request<unknown>("GET", "/chances/me", undefined, options),
    ),

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

  consumeChance: async () =>
    ConsumeResponseSchema.parse(
      await request<unknown>("POST", "/chances/consume"),
    ),
};
