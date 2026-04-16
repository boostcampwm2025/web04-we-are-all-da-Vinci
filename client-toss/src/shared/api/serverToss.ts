const BASE_URL = "/api";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? "요청 실패");
  }

  return response.json() as Promise<T>;
}

export const serverTossApi = {
  login: (body: { authorizationCode: string; referrer: string }) =>
    post<{ userKey: number }>("/oauth/toss/login", body),
};
