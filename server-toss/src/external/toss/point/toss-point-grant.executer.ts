import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TossPromotionExecuteResponse } from "src/modules/auth/types/toss-api.types";
import { PointGrantExecuter } from "src/modules/point/port/point-grant-executer.interface";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossHttpClient } from "../common/toss-http.client";
import { TossPromotionError } from "../common/toss.errors";

@Injectable()
export class TossPointGrantExecuter implements PointGrantExecuter {
  private readonly promotionCode: string;

  constructor(
    private readonly tossHttpClient: TossHttpClient,
    private readonly configService: ConfigService,
  ) {
    const promotionCode =
      this.configService.getOrThrow<string>("PROMOTION_CODE");
    const isProduction =
      this.configService.get<string>("NODE_ENV") === "production";

    this.promotionCode = isProduction ? promotionCode : `TEST_${promotionCode}`;
  }

  async executePromotion(
    userKey: number,
    key: string,
    amount: number,
  ): Promise<void> {
    const data =
      await this.tossHttpClient.request<TossPromotionExecuteResponse>(
        "POST",
        TOSS_API_ENDPOINTS.EXECUTE_PROMOTION,
        {
          "x-toss-user-key": String(userKey),
        },
        JSON.stringify({ promotionCode: this.promotionCode, key, amount }),
      );

    if (data.resultType !== "SUCCESS" || !data.success) {
      throw new TossPromotionError(
        data.error?.errorCode ?? "UNKNOWN",
        data.error?.reason ?? "프로모션 지급에 실패했어요.",
      );
    }
  }
}
