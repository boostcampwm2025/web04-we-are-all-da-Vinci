import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { DailyUserRanking } from "../dailyRanking/daily-user-ranking.entity";
import { Drawing } from "../drawing/drawing.entity";
import { PromptModule } from "../prompt/prompt.module";
import { ArchiveController } from "./archive.controller";
import { ArchiveService } from "./archive.service";

@Module({
  imports: [
    MikroOrmModule.forFeature([DailyUserRanking, Drawing]),
    PromptModule,
  ],
  controllers: [ArchiveController],
  providers: [ArchiveService],
})
export class ArchiveModule {}
