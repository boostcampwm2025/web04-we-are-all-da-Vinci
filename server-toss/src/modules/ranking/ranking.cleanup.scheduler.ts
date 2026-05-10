import { Cron, CronExpression } from "@nestjs/schedule";
import { Injectable, Logger } from "@nestjs/common";
import { RankingRepository } from "./ranking.repository";

@Injectable()
export class RankingCleanupScheduler {
  private readonly logger = new Logger(RankingCleanupScheduler.name);

  constructor(private readonly rankingRepository: RankingRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRankingSnapshotCleanup() {
    try {
      await this.rankingRepository.cleanupRanking();
    } catch (err) {
      this.logger.error(
        { event: "ranking.cleanup.scheduler.failed", err },
        "랭킹 클린업 스케줄러 실패",
      );
    }
  }
}
