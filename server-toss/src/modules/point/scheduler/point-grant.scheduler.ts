import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { EntityManager } from "@mikro-orm/mysql";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PointService } from "../point.service";

@Injectable()
export class PointGrantScheduler {
  constructor(
    private readonly em: EntityManager,
    private readonly pointService: PointService,
  ) {}

  @CreateRequestContext((self: PointGrantScheduler) => self.em)
  @Cron(CronExpression.EVERY_SECOND, { timeZone: "Asia/Seoul" })
  async processEligiblePoints() {
    await this.pointService.settleGrantRequests();
  }
}
