import type { MyRankingResponse, RankingListItem } from "@/entities/ranking";

const BASE_URL = "/api";

interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? "요청 실패");
  }

  return response.json() as Promise<T>;
}

function createHeaders(headers?: HeadersInit): Headers {
  return new Headers(headers);
}

async function get<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, {
    method: "GET",
    headers: createHeaders(options.headers),
    signal: options.signal,
  });
}

async function post<T>(
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const headers = createHeaders(options.headers);
  headers.set("Content-Type", "application/json");

  return request<T>(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  });
}

export const serverTossApi = {
  login: (body: {
    authorizationCode: string;
    referrer: "DEFAULT" | "SANDBOX";
  }) => post<{ userKey: number }>("/oauth/toss/login", body),
  getMyRanking: (options?: RequestOptions) => {
    const headers = createHeaders(options?.headers);

    headers.set("x-user-id", `1`);

    return get<MyRankingResponse>("/rankings/me", {
      ...options,
      headers,
    });
  },
  getRankingList: (options?: RequestOptions) => {
    const headers = createHeaders(options?.headers);

    // TODO: 서버 확정 후 x-user-id에 전달할 식별자로 교체한다.
    headers.set("x-user-id", `1`);

    return get<RankingListItem[]>("/rankings", {
      ...options,
      headers,
    });
  },
};
