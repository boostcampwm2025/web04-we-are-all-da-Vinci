import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointModule } from "src/modules/point/point.module";
import { Quest } from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";
import { QuestService } from "./quest.service";

@Module({
  imports: [MikroOrmModule.forFeature([Quest, UserQuest]), PointModule],
  providers: [QuestService],
  exports: [QuestService],
})
export class QuestModule {}
