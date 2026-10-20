export type PointGrantResult =
  | { type: "PENDING" }
  | { type: "SUCCESS" }
  | { type: "FAILED" }
  | { type: "NOT_FOUND" };

export abstract class PointGrantExecuter {
  abstract executePromotion(
    userKey: number,
    key: string,
    amount: number,
  ): Promise<void>;

  abstract getPromotionResult(
    userKey: number,
    key: string,
  ): Promise<PointGrantResult>;
}
