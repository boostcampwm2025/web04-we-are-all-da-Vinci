import { appLogin } from "@apps-in-toss/web-framework";
import {
  LoginResponseSchema,
  UserInfoResponseSchema,
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
      throw new Error("토큰 재발급 응답이 올바르지 않습니다");
    }
    localStorage.setItem("access_token", parsed.data.accessToken);
    return parsed.data.accessToken;
  })().finally(() => {
    reissuePromise = null;
  });
  return reissuePromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const makeHeaders = (token: string | null) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetchOnce = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: makeHeaders(token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

export const serverTossApi = {
  login: async (body: {
    authorizationCode: string;
    referrer: "DEFAULT" | "SANDBOX";
  }) => LoginResponseSchema.parse(await request<unknown>("POST", LOGIN_PATH, body)),

  logout: () => request<void>("POST", "/oauth/toss/logout"),

  getMe: async () =>
    UserInfoResponseSchema.parse(await request<unknown>("GET", "/user/me")),
};
