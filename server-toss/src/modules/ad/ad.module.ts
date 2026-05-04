import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { User } from "../user/user.entity";
import { AdView } from "./ad-view.entity";
import { AdController } from "./ad.controller";
import { AdService } from "./ad.service";

@Module({
  imports: [MikroOrmModule.forFeature([AdView, User])],
  controllers: [AdController],
  providers: [AdService],
})
export class AdModule {}
