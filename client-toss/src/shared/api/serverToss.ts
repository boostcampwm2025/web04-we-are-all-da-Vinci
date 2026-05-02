import type { PodiumEntry } from "@/entities/podium";
import type { MyRankingResponse, RankingListItem } from "@/entities/ranking";
import type { MyDrawingsResponse } from "@toss/shared";

const BASE_URL = "/api";

interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
}

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, init);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? "요청 실패");
  }

  return response.json() as Promise<T>;
};

const createHeaders = (headers?: HeadersInit): Headers => {
  return new Headers(headers);
};

const getCurrentUserId = () => {
  return localStorage.getItem("userId") ?? "1";
};

const get = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  return request<T>(path, {
    method: "GET",
    headers: createHeaders(options.headers),
    signal: options.signal,
  });
};

const post = async <T>(
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> => {
  const headers = createHeaders(options.headers);
  headers.set("Content-Type", "application/json");

  return request<T>(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  });
};

export const serverTossApi = {
  login: (body: {
    authorizationCode: string;
    referrer: "DEFAULT" | "SANDBOX";
  }) => post<{ userKey: number }>("/oauth/toss/login", body),
  getMyRanking: (options?: RequestOptions) => {
    const headers = createHeaders(options?.headers);

    headers.set("x-user-id", getCurrentUserId());

    return get<MyRankingResponse>("/rankings/me", {
      ...options,
      headers,
    });
  },
  getRankingList: (options?: RequestOptions) => {
    const headers = createHeaders(options?.headers);

    // TODO: 서버 확정 후 x-user-id에 전달할 식별자로 교체한다.
    headers.set("x-user-id", getCurrentUserId());

    return get<RankingListItem[]>("/rankings", {
      ...options,
      headers,
    });
  },
  getPodium: (options?: RequestOptions) =>
    get<PodiumEntry[]>("/rankings/podium", options),
  getMyDrawings: (options?: RequestOptions) => {
    const headers = createHeaders(options?.headers);

    headers.set("x-user-id", getCurrentUserId());

    return get<MyDrawingsResponse>("/drawing/me", {
      ...options,
      headers,
    });
  },
};
