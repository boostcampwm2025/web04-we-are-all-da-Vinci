import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AdSdkPayload, ShareSdkPayload } from "@toss/shared";

@Injectable()
export class ChanceWhitelistValidator {
  private readonly logger = new Logger(ChanceWhitelistValidator.name);
  private readonly adGroupIdWhitelist: ReadonlySet<string>;
  private readonly shareModuleIdWhitelist: ReadonlySet<string>;

  constructor(configService: ConfigService) {
    this.adGroupIdWhitelist = parseCsvSet(
      configService.getOrThrow<string>("AD_GROUP_ID_WHITELIST"),
    );
    this.shareModuleIdWhitelist = parseCsvSet(
      configService.getOrThrow<string>("SHARE_MODULE_ID_WHITELIST"),
    );
  }

  validateAdGroup(userKey: number, payload: AdSdkPayload): void {
    if (this.adGroupIdWhitelist.has(payload.adGroupId)) return;

    this.logger.warn(
      {
        event: "chance.charge.denied",
        userKey,
        op: "ad",
        reason: "whitelist_miss",
        ...payload,
      },
      "기회 충전 거부",
    );
    throw new ForbiddenException("등록되지 않은 광고예요.");
  }

  validateShareModule(userKey: number, payload: ShareSdkPayload): void {
    if (this.shareModuleIdWhitelist.has(payload.moduleId)) return;

    this.logger.warn(
      {
        event: "chance.charge.denied",
        userKey,
        op: "share",
        reason: "whitelist_miss",
        ...payload,
      },
      "기회 충전 거부",
    );
    throw new ForbiddenException("등록되지 않은 공유 리워드예요.");
  }
}

const parseCsvSet = (value: string): ReadonlySet<string> =>
  new Set(
    value
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean),
  );
