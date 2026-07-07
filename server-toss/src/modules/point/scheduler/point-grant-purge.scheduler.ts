import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { EntityManager } from "@mikro-orm/mysql";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PointService } from "../point.service";

@Injectable()
export class PointGrantPurgeScheduler {
  private readonly logger = new Logger(PointGrantPurgeScheduler.name);

  constructor(
    private readonly em: EntityManager,
    private readonly pointService: PointService,
  ) {}

  @CreateRequestContext((self: PointGrantPurgeScheduler) => self.em)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: "Asia/Seoul" })
  async purgeProcessedRequests() {
    try {
      await this.pointService.purgeProcessedGrantRequests();
    } catch (err) {
      this.logger.error(
        { event: "point_grant.purge.failed", err },
        "포인트 지급 요청 purge 실패",
      );
    }
  }
}
