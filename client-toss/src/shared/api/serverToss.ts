import type {
  PromptResponse,
  SimilarityResponse,
  SubmitDrawingResponse,
  SubmitStrokesRequest,
} from "@toss/shared";

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

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? "요청 실패");
  }

  return response.json() as Promise<T>;
}

export const serverTossApi = {
  login: (body: {
    authorizationCode: string;
    referrer: "DEFAULT" | "SANDBOX";
  }) => post<{ userKey: number }>("/oauth/toss/login", body),

  getPrompt: () => get<PromptResponse>("/prompt"),

  scoreStrokes: (body: SubmitStrokesRequest) =>
    post<SimilarityResponse>("/strokes", body),

  submitDrawing: (body: {
    userKey: string;
    strokes: SubmitStrokesRequest["strokes"];
  }) => post<SubmitDrawingResponse>("/drawing", body),
};
