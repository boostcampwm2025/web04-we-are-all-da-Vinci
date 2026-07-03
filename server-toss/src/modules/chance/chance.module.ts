import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { AdView } from "./ad-view.entity";
import { User } from "../user/user.entity";
import { MissionModule } from "../mission/mission.module";
import { ChanceController } from "./chance.controller";
import { ChanceService } from "./chance.service";
import { ChanceWhitelistValidator } from "./chance-whitelist.validator";
import { PlayChance } from "./play-chance.entity";
import { ShareLog } from "./share-log.entity";

@Module({
  imports: [
    MikroOrmModule.forFeature([PlayChance, ShareLog, AdView, User]),
    MissionModule,
  ],
  controllers: [ChanceController],
  providers: [ChanceService, ChanceWhitelistValidator],
  exports: [ChanceService],
})
export class ChanceModule {}
