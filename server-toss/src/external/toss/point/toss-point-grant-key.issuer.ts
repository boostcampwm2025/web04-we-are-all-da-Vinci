import { TossPromotionKeyResponse } from "src/modules/auth/types/toss-api.types";
import { PointGrantKeyIssuer } from "src/modules/point/port/point-grant-key-issuer.interface";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossHttpClient } from "../common/toss-http.client";
import { TossPromotionError } from "../common/toss.errors";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TossPointGrantKeyIssuer implements PointGrantKeyIssuer {
  constructor(private readonly tossHttpClient: TossHttpClient) {}

  async getPromotionKey(userKey: number): Promise<string> {
    const data = await this.tossHttpClient.request<TossPromotionKeyResponse>(
      "POST",
      TOSS_API_ENDPOINTS.PROMOTION_GET_KEY,
      {
        "x-toss-user-key": String(userKey),
      },
    );

    if (data.resultType !== "SUCCESS" || !data.success) {
      throw new TossPromotionError(
        data.error?.errorCode ?? "UNKNOWN",
        data.error?.reason ?? "프로모션 키 발급에 실패했어요.",
      );
    }

    return data.success.key;
  }
}
