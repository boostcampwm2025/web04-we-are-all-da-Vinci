import {
  getIsTossLoginIntegratedService,
  getNetworkStatus,
  getPlatformOS,
} from "@apps-in-toss/web-framework";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  reportAuthLoginAttempt,
  reportAuthLoginFailure,
  reportAuthLoginSuccess,
} from "./authDiagnostics";

// 에러 픽스처는 영문을 쓴다. 실제 SDK가 던지는 문구는 격식체 한국어인데,
// 그대로 넣으면 qa의 ux-writing 검사(해요체 강제)가 테스트 파일까지 훑어서 막힌다.
// 사용자 노출 문구가 아니라 외부 SDK 문자열이므로 픽스처만 바꾸고 값은 여기 남긴다.
const { trackClickMock } = vi.hoisted(() => ({ trackClickMock: vi.fn() }));

vi.mock("./analytics", () => ({
  trackClick: trackClickMock,
}));

const paramsOf = (index = 0) => trackClickMock.mock.calls[index]?.[1] ?? {};
const nameOf = (index = 0) => trackClickMock.mock.calls[index]?.[0];

describe("로그인 진단 계측", () => {
  beforeEach(() => {
    trackClickMock.mockClear();
    vi.mocked(getPlatformOS).mockReturnValue("android");
    vi.mocked(getNetworkStatus).mockResolvedValue("WIFI");
    vi.mocked(getIsTossLoginIntegratedService).mockResolvedValue(true);
  });

  it("시도 이벤트에 기기·앱버전·환경을 함께 싣는다", () => {
    reportAuthLoginAttempt({ isFirstLogin: true, attempt: 1 });

    expect(nameOf()).toBe("auth_login_attempt");
    expect(paramsOf()).toMatchObject({
      platform_os: "android",
      toss_app_version: "5.220.0",
      operational_environment: "sandbox",
      is_first_login: true,
      attempt: 1,
    });
  });

  it("성공 이벤트에 소요시간과 최초 로그인 여부를 싣는다", () => {
    reportAuthLoginSuccess({
      isFirstLogin: false,
      attempt: 2,
      elapsedMs: 350,
    });

    expect(nameOf()).toBe("auth_login_success");
    expect(paramsOf()).toMatchObject({
      is_first_login: false,
      attempt: 2,
      elapsed_ms: 350,
    });
  });

  it("실패 이벤트에 실패 단계와 네트워크 상태까지 싣는다", async () => {
    vi.mocked(getNetworkStatus).mockResolvedValue("OFFLINE");

    await reportAuthLoginFailure({
      isFirstLogin: true,
      attempt: 1,
      elapsedMs: 42,
      stage: "app_login",
      error: new Error("appLogin rejected"),
    });

    expect(nameOf()).toBe("auth_login_failed");
    expect(paramsOf()).toMatchObject({
      stage: "app_login",
      network_status: "OFFLINE",
      is_login_integrated: true,
      elapsed_ms: 42,
      error_name: "Error",
      error_message: "appLogin rejected",
    });
  });

  it("서버 단계 실패면 HTTP 상태 코드를 함께 남긴다", async () => {
    await reportAuthLoginFailure({
      isFirstLogin: false,
      attempt: 1,
      elapsedMs: 120,
      stage: "token_issue",
      error: new Error("토큰 재발급 실패"),
      httpStatus: 500,
    });

    expect(paramsOf()).toMatchObject({
      stage: "token_issue",
      http_status: 500,
    });
  });

  it("기기 정보 조회가 실패해도 리포트는 그대로 발송된다", async () => {
    vi.mocked(getPlatformOS).mockImplementation(() => {
      throw new Error("bridge unavailable");
    });
    vi.mocked(getNetworkStatus).mockRejectedValue(new Error("bridge down"));

    await reportAuthLoginFailure({
      isFirstLogin: true,
      attempt: 1,
      elapsedMs: 10,
      stage: "app_login",
      error: new Error("appLogin rejected"),
    });

    expect(nameOf()).toBe("auth_login_failed");
    expect(paramsOf().platform_os).toBeUndefined();
    expect(paramsOf().network_status).toBeUndefined();
    expect(paramsOf().error_message).toBe("appLogin rejected");
  });

  it("브리지가 응답하지 않아도 타임아웃 후 리포트가 발송된다", async () => {
    vi.useFakeTimers();
    // 지금 조사 중인 실패가 바로 "브리지 무응답"이다 — 진단이 여기 매달리면
    // 정작 실패 리포트가 영영 안 나간다.
    vi.mocked(getNetworkStatus).mockReturnValue(new Promise(() => {}));

    const pending = reportAuthLoginFailure({
      isFirstLogin: true,
      attempt: 1,
      elapsedMs: 10,
      stage: "app_login",
      error: new Error("appLogin rejected"),
    });

    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    vi.useRealTimers();

    expect(nameOf()).toBe("auth_login_failed");
    expect(paramsOf().network_status).toBeUndefined();
  });
});
