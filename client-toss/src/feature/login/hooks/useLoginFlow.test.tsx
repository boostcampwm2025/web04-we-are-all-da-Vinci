import { RequestError, setAccessToken } from "@/shared/api";
import { appLogin } from "@apps-in-toss/web-framework";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOGIN_FAILURE_MESSAGES } from "../config/loginMessages";
import { useLoginFlow } from "./useLoginFlow";

// 에러 픽스처는 영문을 쓴다 — qa의 ux-writing 검사가 테스트 파일까지 훑는다.
const {
  navigateMock,
  attemptMock,
  successMock,
  failureMock,
  captureErrorMock,
  loginMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  attemptMock: vi.fn(),
  successMock: vi.fn(),
  failureMock: vi.fn(),
  captureErrorMock: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )),
  useNavigate: () => navigateMock,
}));

vi.mock("@/shared/lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib")>()),
  reportAuthLoginAttempt: attemptMock,
  reportAuthLoginSuccess: successMock,
  reportAuthLoginFailure: failureMock,
  captureError: captureErrorMock,
}));

vi.mock("@/shared/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/shared/api")>();
  return {
    ...original,
    serverTossApi: { ...original.serverTossApi, login: loginMock },
  };
});

const bridge = window as { ReactNativeWebView?: unknown };

describe("토스 로그인 흐름", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigateMock.mockClear();
    attemptMock.mockClear();
    successMock.mockClear();
    failureMock.mockClear();
    captureErrorMock.mockClear();
    loginMock.mockReset().mockResolvedValue({
      accessToken: "issued-token",
      nickname: "테스터",
    });
    vi.mocked(appLogin).mockReset().mockResolvedValue({
      authorizationCode: "test-code",
      referrer: "SANDBOX",
    });
    bridge.ReactNativeWebView = {};
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete bridge.ReactNativeWebView;
    vi.restoreAllMocks();
  });

  it("성공하면 토큰을 저장하고 홈으로 이동하며 회차를 리셋한다", async () => {
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      result.current.handleLogin();
    });

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true }),
    );
    expect(attemptMock).toHaveBeenCalledWith({
      isFirstLogin: true,
      attempt: 1,
      source: "login_view",
    });
    expect(successMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isFirstLogin: true,
        attempt: 1,
        source: "login_view",
        sheet: { sheetShown: false, hiddenMs: 0, transitions: 0 },
      }),
    );
    expect(localStorage.getItem("access_token")).toBe("issued-token");
    expect(sessionStorage.getItem("login_attempt")).toBeNull();
    expect(result.current.attempt).toBe(0);
    expect(result.current.errorMessage).toBeNull();
  });

  it("토스 로그인이 거부되면 app_login 단계로 기록하고 안내 문구를 보여준다", async () => {
    const rejected = new Error("LOGIN_CODE_NOT_EXIST: login rejected");
    vi.mocked(appLogin).mockRejectedValue(rejected);
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      result.current.handleLogin();
    });

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        LOGIN_FAILURE_MESSAGES.app_login,
      ),
    );
    expect(failureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "app_login",
        source: "login_view",
        attempt: 1,
        isFirstLogin: true,
        error: rejected,
      }),
    );
    expect(captureErrorMock).toHaveBeenCalledWith(
      rejected,
      expect.objectContaining({
        fingerprint: ["login-failed", "app_login", "Error"],
        tags: expect.objectContaining({
          domain: "auth",
          error_type: "login_failed",
          stage: "app_login",
          error_code: "LOGIN_CODE_NOT_EXIST",
          source: "login_view",
          attempt: 1,
        }),
      }),
    );
    expect(localStorage.getItem("login_pending")).toBeNull();
    expect(result.current.attempt).toBe(1);
    expect(result.current.isLoading).toBe(false);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("브리지가 없으면 토스 앱 안내 문구를 보여주고 따로 그룹핑한다", async () => {
    delete bridge.ReactNativeWebView;
    vi.mocked(appLogin).mockRejectedValue(new Error("bridge missing"));
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      result.current.handleLogin();
    });

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        LOGIN_FAILURE_MESSAGES.bridge_missing,
      ),
    );
    expect(captureErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ fingerprint: ["bridge-missing"] }),
    );
  });

  it("서버가 거부하면 token_issue 단계와 상태 코드를 기록한다", async () => {
    loginMock.mockRejectedValue(new RequestError(500, "server failed"));
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      result.current.handleLogin();
    });

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        LOGIN_FAILURE_MESSAGES.token_issue,
      ),
    );
    expect(failureMock).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "token_issue", httpStatus: 500 }),
    );
  });

  it("응답이 스키마와 다르면 response_schema 단계로 기록한다", async () => {
    const zodError = new Error("invalid response");
    zodError.name = "ZodError";
    loginMock.mockRejectedValue(zodError);
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      result.current.handleLogin();
    });

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        LOGIN_FAILURE_MESSAGES.response_schema,
      ),
    );
    expect(failureMock).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "response_schema" }),
    );
  });

  it("이전 실패 회차가 저장돼 있으면 이어서 센다", async () => {
    sessionStorage.setItem("login_attempt", "1");
    vi.mocked(appLogin).mockRejectedValue(new Error("rejected again"));
    const { result } = renderHook(() => useLoginFlow());

    expect(result.current.attempt).toBe(1);

    await act(async () => {
      result.current.handleLogin();
    });

    await waitFor(() => expect(result.current.attempt).toBe(2));
    expect(attemptMock).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 2 }),
    );
  });

  it("동의 시트 리로드로 돌아오면 자동으로 한 번만 재시도한다", async () => {
    localStorage.setItem("login_pending", "true");
    sessionStorage.setItem("login_attempt", "1");

    renderHook(() => useLoginFlow(), { wrapper: StrictMode });

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true }),
    );
    expect(attemptMock).toHaveBeenCalledTimes(1);
    expect(attemptMock).toHaveBeenCalledWith({
      isFirstLogin: true,
      attempt: 2,
      source: "pending_retry",
    });
  });

  it("자동 재시도 상한을 넘으면 재시도하지 않고 안내 문구만 보여준다", async () => {
    localStorage.setItem("login_pending", "true");
    sessionStorage.setItem("login_attempt", "2");

    const { result } = renderHook(() => useLoginFlow());

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        LOGIN_FAILURE_MESSAGES.app_login,
      ),
    );
    expect(attemptMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("login_pending")).toBeNull();
  });

  it("토큰이 이미 있으면 로그인 없이 홈으로 보낸다", () => {
    setAccessToken("existing-token");

    renderHook(() => useLoginFlow());

    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    expect(attemptMock).not.toHaveBeenCalled();
  });

  it("버튼을 연달아 눌러도 로그인은 한 번만 시작한다", async () => {
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      result.current.handleLogin();
      result.current.handleLogin();
    });

    await waitFor(() => expect(successMock).toHaveBeenCalledTimes(1));
    expect(attemptMock).toHaveBeenCalledTimes(1);
  });
});
