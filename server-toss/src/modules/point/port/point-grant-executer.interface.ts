export interface PointGrantExecuter {
  executePromotion(
    userKey: number,
    key: string,
    promotionCode: string,
    amount: number,
  ): Promise<void>;
}
