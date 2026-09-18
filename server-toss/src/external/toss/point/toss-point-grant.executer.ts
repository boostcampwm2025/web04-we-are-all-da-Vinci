import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  TossPromotionExecuteResponse,
  TossPromotionResultResponse,
} from "src/external/toss/common/toss-api.types";
import {
  PointGrantExecuter,
  PointGrantResult,
} from "src/modules/point/port/point-grant-executer.interface";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossHttpClient } from "../common/toss-http.client";
import {
  TossBusinessErrorCode,
  TossPromotionError,
} from "../common/toss.errors";

@Injectable()
export class TossPointGrantExecuter implements PointGrantExecuter {
  private readonly promotionCode: string;
  private readonly apiKey: string;

  constructor(
    private readonly tossHttpClient: TossHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow<string>("TOSS_API_KEY");

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
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
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

  async getPromotionResult(
    userKey: number,
    key: string,
  ): Promise<PointGrantResult | null> {
    const data = await this.tossHttpClient.request<TossPromotionResultResponse>(
      "POST",
      TOSS_API_ENDPOINTS.GET_PROMOTION_RESULT,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-toss-user-key": String(userKey),
      },
      JSON.stringify({ promotionCode: this.promotionCode, key }),
    );

    if (data.resultType !== "SUCCESS" || !data.success) {
      if (
        data.error?.errorCode ===
        TossBusinessErrorCode.REWARD_PROCESS_NOT_FOUND.errorCode
      ) {
        return null;
      }
      throw new TossPromotionError(
        data.error?.errorCode ?? "UNKNOWN",
        data.error?.reason ?? "프로모션 지급 결과 조회에 실패했어요.",
      );
    }

    return data.success;
  }
}
