export interface PointGrantKeyIssuer {
  getPromotionKey(userKey: number): Promise<string>;
}
