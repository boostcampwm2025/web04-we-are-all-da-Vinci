import { Cron, CronExpression } from "@nestjs/schedule";
import { Injectable } from "@nestjs/common";
import { RankingSnapshotService } from "./ranking.snapshot.service";

@Injectable()
export class RankingSnapshotScheduler {
  constructor(
    private readonly rankingSnapshotService: RankingSnapshotService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleRankingSnapshotRefresh() {
    await this.rankingSnapshotService.refreshRankingSnapshot();
  }
}
