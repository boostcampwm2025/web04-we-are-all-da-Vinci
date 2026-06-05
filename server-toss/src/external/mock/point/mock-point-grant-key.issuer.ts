import { Injectable } from "@nestjs/common";
import { PointGrantKeyIssuer } from "src/modules/point/port/point-grant-key-issuer.interface";

@Injectable()
export class MockPointGrantKeyIssuer extends PointGrantKeyIssuer {
  private promotionKeyCounter = 1;

  getPromotionKey(userKey: number): Promise<string> {
    return Promise.resolve(`mock-key-${userKey}-${this.promotionKeyCounter++}`);
  }
}
