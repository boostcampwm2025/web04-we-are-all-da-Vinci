import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PointGrantExecuter } from "src/modules/point/port/point-grant-executer.interface";

@Injectable()
export class MockPointGrantExecuter extends PointGrantExecuter {
  private readonly logger = new Logger(MockPointGrantExecuter.name);
  private readonly latencyMs: number;

  constructor(configService: ConfigService) {
    super();
    this.latencyMs = configService.get<number>("MOCK_EXTERNAL_LATENCY_MS", 0);
  }

  async executePromotion(
    userKey: number,
    key: string,
    amount: number,
  ): Promise<void> {
    await this.delay();
    this.logger.debug(
      { event: "mock.promotion.executed", userKey, key, amount },
      "Mock 프로모션 지급 완료",
    );
  }

  private delay(): Promise<void> {
    if (this.latencyMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
