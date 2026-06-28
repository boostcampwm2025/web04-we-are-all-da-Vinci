import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { EntityManager } from "@mikro-orm/mysql";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DailyRankingSnapshotService } from "../dailyRanking/daily-ranking-snapshot.service";
import { RankingService } from "./ranking.service";

@Injectable()
export class RankingCleanupScheduler {
  private readonly logger = new Logger(RankingCleanupScheduler.name);

  constructor(
    private readonly em: EntityManager,
    private readonly rankingService: RankingService,
    private readonly dailyRankingSnapshotService: DailyRankingSnapshotService,
  ) {}

  @CreateRequestContext((self: RankingCleanupScheduler) => self.em)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: "Asia/Seoul" })
  async handleRankingSnapshotCleanup() {
    try {
      await this.dailyRankingSnapshotService.createYesterdaySnapshot();
      await this.rankingService.cleanupRanking();
    } catch (err) {
      this.logger.error(
        { event: "ranking.cleanup.scheduler.failed", err },
        "랭킹 클린업 스케줄러 실패",
      );
    }
  }
}
