import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { Ranking } from "./ranking.entity";
import { RankingController } from "./ranking.controller";
import { RankingService } from "./ranking.service";
import { RankingCleanupScheduler } from "./ranking.cleanup.scheduler";

@Module({
  imports: [MikroOrmModule.forFeature([Ranking])],
  controllers: [RankingController],
  providers: [RankingService, RankingCleanupScheduler],
  exports: [RankingService],
})
export class RankingModule {}
