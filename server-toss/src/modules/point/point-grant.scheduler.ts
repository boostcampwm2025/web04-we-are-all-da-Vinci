import { Injectable } from "@nestjs/common";
import { PointService } from "./point.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class PointGrantScheduler {
  constructor(private readonly pointService: PointService) {}

  @Cron(CronExpression.EVERY_SECOND, { timeZone: "Asia/Seoul" })
  async processEligiblePoints() {
    await this.pointService.settleGrantRequests();
  }
}
