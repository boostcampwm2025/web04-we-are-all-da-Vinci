import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointModule } from "src/modules/point/point.module";
import { Quest } from "./entitiy/quest.entity";
import { UserQuest } from "./entitiy/user-quest.entity";
import { QuestService } from "./quest.service";

@Module({
  imports: [MikroOrmModule.forFeature([Quest, UserQuest]), PointModule],
  providers: [QuestService],
  exports: [QuestService],
})
export class QuestModule {}
