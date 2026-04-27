import { Cron, CronExpression } from "@nestjs/schedule";
import { Injectable } from "@nestjs/common";
import { RankingSnapshotService } from "./ranking.snapshot.service";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class RankingSnapshotScheduler {
  constructor(
    private readonly rankingSnapshotService: RankingSnapshotService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RankingSnapshotScheduler.name);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleRankingSnapshotRefresh() {
    try {
      await this.rankingSnapshotService.refreshRankingSnapshot();
    } catch (error) {
      this.logger.error({ error }, "랭킹 스냅샷 갱신 실패");
    }
  }
}
