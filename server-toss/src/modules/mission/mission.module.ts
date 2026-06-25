import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointModule } from "src/modules/point/point.module";
import { Mission } from "./entity/mission.entity";
import { UserMission } from "./entity/user-mission.entity";
import { MissionController } from "./mission.controller";
import { AssignMissionService } from "./service/assign-mission.service";
import { MissionProcessor } from "./service/mission.processor";
import { MissionSeedService } from "./service/mission.seed";
import { MissionService } from "./service/mission.service";
import { TutorialMissionService } from "./service/tutorial-mission.service";

@Module({
  imports: [MikroOrmModule.forFeature([Mission, UserMission]), PointModule],
  controllers: [MissionController],
  providers: [
    MissionService,
    MissionProcessor,
    MissionSeedService,
    AssignMissionService,
    TutorialMissionService,
  ],
  exports: [MissionService, TutorialMissionService],
})
export class MissionModule {}
