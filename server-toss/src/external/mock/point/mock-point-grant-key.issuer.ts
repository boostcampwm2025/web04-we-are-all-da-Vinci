import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PointGrantKeyIssuer } from "src/modules/point/port/point-grant-key-issuer.interface";

@Injectable()
export class MockPointGrantKeyIssuer extends PointGrantKeyIssuer {
  private promotionKeyCounter = 1;
  private readonly latencyMs: number;

  constructor(configService: ConfigService) {
    super();
    this.latencyMs = configService.get<number>("MOCK_EXTERNAL_LATENCY_MS", 0);
  }

  async getPromotionKey(userKey: number): Promise<string> {
    await this.delay();
    return `mock-key-${userKey}-${this.promotionKeyCounter++}`;
  }

  private delay(): Promise<void> {
    if (this.latencyMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
