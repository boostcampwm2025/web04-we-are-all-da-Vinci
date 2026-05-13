import { validateChanceWhitelistEnv } from "./env.validation";

describe("validateChanceWhitelistEnv", () => {
  const validEnv: Record<string, unknown> = {
    AD_GROUP_ID_WHITELIST: "ad-group-1,ad-group-2",
    SHARE_MODULE_ID_WHITELIST: "module-1,module-2",
  };

  it("필수 whitelist 환경변수가 있으면 통과한다", () => {
    expect(validateChanceWhitelistEnv(validEnv)).toBe(validEnv);
  });

  it("AD_GROUP_ID_WHITELIST 누락 시 실패한다", () => {
    expect(() =>
      validateChanceWhitelistEnv({
        SHARE_MODULE_ID_WHITELIST: "module-1",
      }),
    ).toThrow("환경변수 검증 실패");
  });

  it("SHARE_MODULE_ID_WHITELIST 누락 시 실패한다", () => {
    expect(() =>
      validateChanceWhitelistEnv({
        AD_GROUP_ID_WHITELIST: "ad-group-1",
      }),
    ).toThrow("환경변수 검증 실패");
  });

  it("빈 문자열이면 실패한다", () => {
    expect(() =>
      validateChanceWhitelistEnv({
        AD_GROUP_ID_WHITELIST: "",
        SHARE_MODULE_ID_WHITELIST: "module-1",
      }),
    ).toThrow("환경변수 검증 실패");
  });

  it("공백 문자열이면 실패한다", () => {
    expect(() =>
      validateChanceWhitelistEnv({
        AD_GROUP_ID_WHITELIST: "   ",
        SHARE_MODULE_ID_WHITELIST: "module-1",
      }),
    ).toThrow("환경변수 검증 실패");
  });

  it("토큰이 없는 CSV 형식이면 실패한다", () => {
    expect(() =>
      validateChanceWhitelistEnv({
        AD_GROUP_ID_WHITELIST: ", ,",
        SHARE_MODULE_ID_WHITELIST: "module-1",
      }),
    ).toThrow("환경변수 검증 실패");
  });

  it("다른 환경변수 값/타입은 이 검증에서 판단하지 않는다", () => {
    const envWithExtra: Record<string, unknown> = {
      ...validEnv,
      PORT: 3001,
      CUSTOM_FLAG: true,
      NESTED_VALUE: { any: "value" },
    };

    expect(validateChanceWhitelistEnv(envWithExtra)).toBe(envWithExtra);
  });

  it("성공 시 원본 config의 다른 키도 그대로 보존한다", () => {
    const envWithExtra: Record<string, unknown> = {
      ...validEnv,
      LOG_LEVEL: "debug",
      EXTRA_KEY: "keep-me",
    };

    const result = validateChanceWhitelistEnv(envWithExtra);
    expect(result).toEqual(envWithExtra);
    expect(result.LOG_LEVEL).toBe("debug");
    expect(result.EXTRA_KEY).toBe("keep-me");
  });
});
