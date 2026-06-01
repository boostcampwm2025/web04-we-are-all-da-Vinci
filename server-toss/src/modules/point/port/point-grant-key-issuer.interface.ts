export abstract class PointGrantKeyIssuer {
  abstract getPromotionKey(userKey: number): Promise<string>;
}
