export type PointGrantResult = "PENDING" | "SUCCESS" | "FAILED";

export abstract class PointGrantExecuter {
  abstract executePromotion(
    userKey: number,
    key: string,
    amount: number,
  ): Promise<void>;

  abstract getPromotionResult(
    userKey: number,
    key: string,
  ): Promise<PointGrantResult | null>;
}
