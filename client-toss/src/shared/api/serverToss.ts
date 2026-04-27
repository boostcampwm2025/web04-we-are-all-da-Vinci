import { appLogin } from "@apps-in-toss/web-framework";

const BASE_URL = "/api";
const LOGIN_PATH = "/oauth/toss/login";

const getToken = () => localStorage.getItem("access_token");

async function reissueToken(): Promise<string> {
  const { authorizationCode, referrer } = await appLogin();
  const res = await fetch(`${BASE_URL}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorizationCode, referrer }),
  });
  const { accessToken } = (await res.json()) as { accessToken: string };
  localStorage.setItem("access_token", accessToken);
  return accessToken;
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
  login: (body: {
    authorizationCode: string;
    referrer: "DEFAULT" | "SANDBOX";
  }) => request<{ accessToken: string }>("POST", LOGIN_PATH, body),

  logout: () => request<void>("POST", "/oauth/toss/logout"),

  getMe: () =>
    request<{
      userKey: number;
      name: string;
      gender?: string;
      birthday?: Date;
    }>("GET", "/user/me"),
};
