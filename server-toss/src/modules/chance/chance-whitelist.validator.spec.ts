import { ForbiddenException, Logger } from "@nestjs/common";
import { ChanceWhitelistValidator } from "./chance-whitelist.validator";

const ALLOWED_AD_GROUP = "ait.dev.allowed-group";
const ALLOWED_MODULE = "module-allowed";

const buildConfigService = () => ({
  getOrThrow: jest.fn((key: string) => {
    switch (key) {
      case "AD_GROUP_ID_WHITELIST":
        return ALLOWED_AD_GROUP;
      case "SHARE_MODULE_ID_WHITELIST":
        return ALLOWED_MODULE;
      default:
        throw new Error(`Unknown key: ${key}`);
    }
  }),
});

describe("ChanceWhitelistValidator", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("허용된 adGroupId는 통과한다", () => {
    const validator = new ChanceWhitelistValidator(
      buildConfigService() as never,
    );

    expect(() =>
      validator.validateAdGroup(1, { adGroupId: ALLOWED_AD_GROUP }),
    ).not.toThrow();
  });

  it("허용되지 않은 adGroupId는 도메인 에러를 던지고 로그를 남긴다", () => {
    const validator = new ChanceWhitelistValidator(
      buildConfigService() as never,
    );
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();

    expect(() =>
      validator.validateAdGroup(1, { adGroupId: "unknown-group" }),
    ).toThrow(ForbiddenException);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("허용된 moduleId는 통과한다", () => {
    const validator = new ChanceWhitelistValidator(
      buildConfigService() as never,
    );

    expect(() =>
      validator.validateShareModule(1, {
        channel: "contactsViral",
        moduleId: ALLOWED_MODULE,
      }),
    ).not.toThrow();
  });

  it("허용되지 않은 moduleId는 도메인 에러를 던지고 로그를 남긴다", () => {
    const validator = new ChanceWhitelistValidator(
      buildConfigService() as never,
    );
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();

    expect(() =>
      validator.validateShareModule(1, {
        channel: "contactsViral",
        moduleId: "unknown-module",
      }),
    ).toThrow(ForbiddenException);
    expect(warnSpy).toHaveBeenCalled();
  });
});
