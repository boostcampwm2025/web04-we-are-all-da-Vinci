import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { Ranking } from "./ranking.entity";
import { RankingController } from "./ranking.controller";
import { RankingSnapshotScheduler } from "./ranking.snapshot.scheduler";
import { RankingSnapshotService } from "./ranking.snapshot.service";
import { RankingService } from "./ranking.service";

@Module({
  imports: [MikroOrmModule.forFeature([Ranking])],
  controllers: [RankingController],
  providers: [RankingService, RankingSnapshotService, RankingSnapshotScheduler],
})
export class RankingModule {}
