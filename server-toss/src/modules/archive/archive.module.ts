import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { DailyUserRanking } from "../dailyRanking/daily-user-ranking.entity";
import { Drawing } from "../drawing/drawing.entity";
import { ArchiveController } from "./archive.controller";
import { ArchiveService } from "./archive.service";

@Module({
  imports: [MikroOrmModule.forFeature([DailyUserRanking, Drawing])],
  controllers: [ArchiveController],
  providers: [ArchiveService],
})
export class ArchiveModule {}
