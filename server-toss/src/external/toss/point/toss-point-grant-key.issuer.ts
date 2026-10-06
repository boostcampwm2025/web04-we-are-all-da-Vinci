import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TossPromotionKeyResponse } from "src/external/toss/common/toss-api.types";
import { PointGrantKeyIssuer } from "src/modules/point/port/point-grant-key-issuer.interface";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossHttpClient } from "../common/toss-http.client";
import {
  createTossPromotionError,
  TossRateLimitError,
} from "../common/toss.errors";
import {
  KEY_PREFIX,
  PromotionRateLimiter,
} from "src/external/rate-limiter/promotion-rate-limiter";

@Injectable()
export class TossPointGrantKeyIssuer implements PointGrantKeyIssuer {
  private readonly apiKey: string;

  constructor(
    private readonly tossHttpClient: TossHttpClient,
    private readonly configService: ConfigService,
    private readonly ratelimiter: PromotionRateLimiter,
  ) {
    this.apiKey = this.configService.getOrThrow<string>("TOSS_API_KEY");
  }

  async getPromotionKey(userKey: number): Promise<string> {
    const rlRes = await this.ratelimiter.acquireApi(KEY_PREFIX.KEY_ISSUE);
    if (rlRes.success !== "SUCCESS") {
      throw new TossRateLimitError(rlRes.msBeforeNext, "요청 한도 초과");
    }
    const data = await this.tossHttpClient.request<TossPromotionKeyResponse>(
      "POST",
      TOSS_API_ENDPOINTS.PROMOTION_GET_KEY,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-toss-user-key": String(userKey),
      },
    );

    if (data.resultType !== "SUCCESS" || !data.success) {
      throw createTossPromotionError(
        data.error?.errorCode ?? "UNKNOWN",
        data.error?.reason ?? "프로모션 키 발급에 실패했어요.",
      );
    }

    return data.success.key;
  }
}
