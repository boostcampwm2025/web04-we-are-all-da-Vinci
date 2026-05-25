import { Injectable, Logger } from "@nestjs/common";
import { PointService } from "./point.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";

@Injectable()
export class PointGrantScheduler {
  private readonly logger = new Logger(PointGrantScheduler.name);

  constructor(private readonly pointService: PointService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  @CreateRequestContext()
  async processEligiblePoints() {
    await this.pointService.settleGrantRequests();
  }
}
