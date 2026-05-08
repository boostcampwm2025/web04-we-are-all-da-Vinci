import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { AdView } from "../ad/ad-view.entity";
import { User } from "../user/user.entity";
import { ChanceController } from "./chance.controller";
import { ChanceService } from "./chance.service";
import { PlayChance } from "./play-chance.entity";
import { ShareLog } from "./share-log.entity";

@Module({
  imports: [MikroOrmModule.forFeature([PlayChance, ShareLog, AdView, User])],
  controllers: [ChanceController],
  providers: [ChanceService],
})
export class ChanceModule {}
