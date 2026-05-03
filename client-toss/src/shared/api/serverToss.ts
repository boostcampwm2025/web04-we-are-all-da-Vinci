import type { PodiumEntry } from "@/entities/podium";
import type { MyRankingResponse, RankingListItem } from "@/entities/ranking";
import { appLogin } from "@apps-in-toss/web-framework";
import { LoginResponseSchema, UserInfoResponseSchema } from "@toss/shared";
import type {
  MyDrawingResponse,
  MyDrawingsResponse,
  PromptResponse,
  SimilarityResponse,
  SubmitDrawingResponse,
  SubmitStrokesRequest,
} from "@toss/shared";

const BASE_URL = "/api";
const LOGIN_PATH = "/oauth/toss/login";

const getToken = () => localStorage.getItem("access_token");

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
      localStorage.removeItem("access_token");
      throw new Error("토큰 재발급 실패");
    }
    const parsed = LoginResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      localStorage.removeItem("access_token");
      throw new Error("토큰 재발급 응답이 올바르지 않아요");
    }
    localStorage.setItem("access_token", parsed.data.accessToken);
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

interface RankingListServerResponse {
  updatedAt: string;
  rankings: RankingListItem[];
}

type DrawingDetailResponse = MyDrawingResponse & {
  name: string;
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
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };

  const fetchOnce = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: makeHeaders(token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });

  let response = await fetchOnce(getToken());

  // 로그인 엔드포인트는 재시도 안 함 (무한 루프 방지)
  if (response.status === 401 && path !== LOGIN_PATH) {
    const newToken = await reissueToken();
    response = await fetchOnce(newToken);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? "요청 실패");
  }

  // 204 No Content 등 body 없는 응답 처리
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const createHeaders = (headers?: HeadersInit): Headers => new Headers(headers);

const getCurrentUserId = () => {
  return localStorage.getItem("userId") ?? "1";
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

  getPrompt: () => request<PromptResponse>("GET", "/prompt"),

  scoreStrokes: (body: SubmitStrokesRequest) =>
    request<SimilarityResponse>("POST", "/strokes", body),

  submitDrawing: (body: {
    userKey: string;
    strokes: SubmitStrokesRequest["strokes"];
  }) => request<SubmitDrawingResponse>("POST", "/drawing", body),

  getMyRanking: (options?: RequestOptions) => {
    const headers = createHeaders(options?.headers);
    headers.set("x-user-id", getCurrentUserId());
    return get<MyRankingResponse>("/rankings/me", { ...options, headers });
  },

  getRankingList: (options?: RequestOptions) => {
    const headers = createHeaders(options?.headers);
    // TODO: 서버 확정 후 x-user-id에 전달할 식별자로 교체한다.
    headers.set("x-user-id", getCurrentUserId());
    return get<RankingListServerResponse>("/rankings", {
      ...options,
      headers,
    }).then(({ rankings }) => rankings);
  },

  getPodium: (options?: RequestOptions) =>
    get<PodiumEntry[]>("/rankings/podium", options),

  getMyDrawings: (options?: RequestOptions) => {
    const headers = createHeaders(options?.headers);
    headers.set("x-user-id", getCurrentUserId());
    return get<MyDrawingsResponse>("/drawing/me", { ...options, headers });
  },

  getDrawing: (drawingId: string, options?: RequestOptions) =>
    get<DrawingDetailResponse>(`/drawing/${drawingId}`, options),
};
