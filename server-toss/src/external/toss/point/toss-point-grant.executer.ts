import { TossPromotionExecuteResponse } from "src/modules/auth/types/toss-api.types";
import { PointGrantExecuter } from "src/modules/point/port/point-grant-executer.interface";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossHttpClient } from "../common/toss-http.client";
import { TossPromotionError } from "../common/toss.errors";

export class TossPointGrantExecuter implements PointGrantExecuter {
  constructor(private readonly tossHttpClient: TossHttpClient) {}

  async executePromotion(
    userKey: number,
    key: string,
    promotionCode: string,
    amount: number,
  ): Promise<void> {
    const data =
      await this.tossHttpClient.request<TossPromotionExecuteResponse>(
        "POST",
        TOSS_API_ENDPOINTS.EXECUTE_PROMOTION,
        {
          "x-toss-user-key": String(userKey),
        },
        JSON.stringify({ promotionCode, key, amount }),
      );

    if (data.resultType !== "SUCCESS" || !data.success) {
      throw new TossPromotionError(
        data.error?.errorCode ?? "UNKNOWN",
        data.error?.reason ?? "프로모션 지급에 실패했어요.",
      );
    }
  }
}
