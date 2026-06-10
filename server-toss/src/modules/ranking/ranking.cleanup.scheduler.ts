import { Cron, CronExpression } from "@nestjs/schedule";
import { Injectable, Logger } from "@nestjs/common";
import { RankingRepository } from "./ranking.repository";
import { DailyRankingSnapshotService } from "../dailyRanking/daily-ranking-snapshot.service";

@Injectable()
export class RankingCleanupScheduler {
  private readonly logger = new Logger(RankingCleanupScheduler.name);

  constructor(
    private readonly rankingRepository: RankingRepository,
    private readonly dailyRankingSnapshotService: DailyRankingSnapshotService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: "Asia/Seoul" })
  async handleRankingSnapshotCleanup() {
    try {
      await this.dailyRankingSnapshotService.createYesterdaySnapshot();
      await this.rankingRepository.cleanupRanking();
    } catch (err) {
      this.logger.error(
        { event: "ranking.cleanup.scheduler.failed", err },
        "랭킹 클린업 스케줄러 실패",
      );
    }
  }
}
