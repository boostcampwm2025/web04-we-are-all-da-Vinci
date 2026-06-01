export abstract class PointGrantExecuter {
  abstract executePromotion(
    userKey: number,
    key: string,
    amount: number,
  ): Promise<void>;
}
