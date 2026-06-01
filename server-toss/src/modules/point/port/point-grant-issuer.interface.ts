export interface PointGrantIssuer {
  getPromotionKey(userKey: number): Promise<string>;
}
