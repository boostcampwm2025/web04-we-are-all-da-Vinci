import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { EntityManager } from "@mikro-orm/mysql";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { PointService } from "../point.service";

@Injectable()
export class PointGrantScheduler implements OnApplicationBootstrap {
  constructor(
    private readonly em: EntityManager,
    private readonly pointService: PointService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onApplicationBootstrap() {
    await this.initialize();

    const job = this.schedulerRegistry.getCronJob("point_worker");
    job.start();
  }

  @Cron(CronExpression.EVERY_SECOND, {
    name: "point_worker",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
    disabled: true,
  })
  @CreateRequestContext((self: PointGrantScheduler) => self.em)
  async processEligiblePoints() {
    const isSuspended = await this.pointService.settleGrantRequests();

    if (!isSuspended) {
      return;
    }

    const job = this.schedulerRegistry.getCronJob("point_worker");
    job.stop();
  }

  @CreateRequestContext((self: PointGrantScheduler) => self.em)
  private async initialize() {
    await this.pointService.resumeSuspended();
  }
}
