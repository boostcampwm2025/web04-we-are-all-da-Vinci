import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { Drawing } from "../drawing/drawing.entity";
import { DailyUserRanking } from "./daily-user-ranking.entity";
import { DailyRankingSnapshotService } from "./daily-ranking-snapshot.service";

@Module({
  imports: [MikroOrmModule.forFeature([DailyUserRanking, Drawing])],
  providers: [DailyRankingSnapshotService],
  exports: [DailyRankingSnapshotService],
})
export class DailyRankingModule {}
