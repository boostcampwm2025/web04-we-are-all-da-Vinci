import { Cron, CronExpression } from "@nestjs/schedule";
import { Injectable, Logger } from "@nestjs/common";
import { RankingSnapshotService } from "./ranking.snapshot.service";

@Injectable()
export class RankingSnapshotScheduler {
  private readonly logger = new Logger(RankingSnapshotScheduler.name);

  constructor(
    private readonly rankingSnapshotService: RankingSnapshotService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRankingSnapshotRefresh() {
    try {
      await this.rankingSnapshotService.refreshRankingSnapshot();
    } catch (err) {
      this.logger.error(
        { event: "ranking.snapshot.scheduler.failed", err },
        "랭킹 스냅샷 스케줄러 실패",
      );
    }
  }
}
