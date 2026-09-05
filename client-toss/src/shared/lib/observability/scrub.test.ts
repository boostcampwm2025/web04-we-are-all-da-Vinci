import { describe, expect, it } from "vitest";
import { scrubDeep, scrubString } from "./scrub";

describe("관측 이벤트 인증 정보 마스킹", () => {
  it("Bearer 접두 토큰을 문자열에서 지운다", () => {
    const input = "요청 헤더: Bearer abc.def-ghi 로 전송";
    expect(scrubString(input)).not.toContain("abc.def-ghi");
    expect(scrubString(input)).toContain("[redacted]");
  });

  it("JWT 형태 문자열을 지운다", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-DEF_123";
    expect(scrubString(`token=${jwt}`)).not.toContain(jwt);
  });

  it("민감한 키의 값을 통째로 마스킹한다", () => {
    const scrubbed = scrubDeep({
      Authorization: "Bearer secret",
      access_token: "secret-token",
      authorizationCode: "auth-code-123",
      safe: "일반 값",
    });
    expect(scrubbed.Authorization).toBe("[redacted]");
    expect(scrubbed.access_token).toBe("[redacted]");
    expect(scrubbed.authorizationCode).toBe("[redacted]");
    expect(scrubbed.safe).toBe("일반 값");
  });

  it("중첩 객체와 배열 안까지 마스킹한다", () => {
    const scrubbed = scrubDeep({
      request: {
        headers: [{ authorization: "Bearer nested-secret" }],
      },
    });
    expect(scrubbed.request.headers[0].authorization).toBe("[redacted]");
  });

  it("민감하지 않은 구조는 그대로 보존한다", () => {
    const input = { message: "에러 발생", status: 500, tags: ["a", "b"] };
    expect(scrubDeep(input)).toEqual(input);
  });
});
