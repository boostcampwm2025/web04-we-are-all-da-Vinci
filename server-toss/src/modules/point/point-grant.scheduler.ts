import { Injectable } from "@nestjs/common";
import { PointService } from "./point.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";

@Injectable()
export class PointGrantScheduler {
  constructor(private readonly pointService: PointService) {}

  @Cron(CronExpression.EVERY_SECOND, { timeZone: "Asia/Seoul" })
  @CreateRequestContext()
  async processEligiblePoints() {
    await this.pointService.settleGrantRequests();
  }
}
