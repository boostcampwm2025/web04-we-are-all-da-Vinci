import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { Ranking } from "./ranking.entity";
import { RankingController } from "./ranking.controller";
import { RankingService } from "./ranking.service";
import { RankingCleanupScheduler } from "./ranking.cleanup.scheduler";
import { DailyRankingModule } from "../dailyRanking/daily-ranking.module";
import { Drawing } from "../drawing/drawing.entity";

@Module({
  imports: [MikroOrmModule.forFeature([Ranking, Drawing]), DailyRankingModule],
  controllers: [RankingController],
  providers: [RankingService, RankingCleanupScheduler],
  exports: [RankingService],
})
export class RankingModule {}
