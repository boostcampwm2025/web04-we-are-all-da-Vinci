export abstract class PointGrantExecuter {
  abstract executePromotion(
    userKey: number,
    key: string,
    promotionCode: string,
    amount: number,
  ): Promise<void>;
}
