import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointModule } from "src/modules/point/point.module";
import { Quest } from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";
import { QuestController } from "./quest.controller";
import { QuestProcessor } from "./service/quest.processor";
import { QuestSeedService } from "./service/quest.seed";
import { QuestService } from "./service/quest.service";
import { AssignQuestService } from "./service/assign-quest.service";

@Module({
  imports: [MikroOrmModule.forFeature([Quest, UserQuest]), PointModule],
  controllers: [QuestController],
  providers: [
    QuestService,
    QuestProcessor,
    QuestSeedService,
    AssignQuestService,
  ],
  exports: [QuestService],
})
export class QuestModule {}
