import { Cron, CronExpression } from "@nestjs/schedule";
import { Injectable, Logger } from "@nestjs/common";
import { RankingService } from "./ranking.service";
import { DailyRankingSnapshotService } from "../dailyRanking/daily-ranking-snapshot.service";

@Injectable()
export class RankingCleanupScheduler {
  private readonly logger = new Logger(RankingCleanupScheduler.name);

  constructor(
    private readonly rankingService: RankingService,
    private readonly dailyRankingSnapshotService: DailyRankingSnapshotService,
  ) {}

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
