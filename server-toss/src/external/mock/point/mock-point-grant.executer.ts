import { Injectable, Logger } from "@nestjs/common";
import { PointGrantExecuter } from "src/modules/point/port/point-grant-executer.interface";

@Injectable()
export class MockPointGrantExecuter extends PointGrantExecuter {
  private readonly logger = new Logger(MockPointGrantExecuter.name);

  executePromotion(
    userKey: number,
    key: string,
    amount: number,
  ): Promise<void> {
    this.logger.debug(
      { event: "mock.promotion.executed", userKey, key, amount },
      "Mock 프로모션 지급 완료",
    );
    return Promise.resolve();
  }
}
