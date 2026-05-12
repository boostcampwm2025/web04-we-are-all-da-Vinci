import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointModule } from "../point/point.module";
import { PromptModule } from "../prompt/prompt.module";
import { DrawingController } from "./drawing.controller";
import { Drawing } from "./drawing.entity";
import { DrawingService } from "./service/drawing.service";
import { DrawingAccessService } from "./service/drawing-access.service";
import { UserModule } from "../user/user.module";
import { RankingModule } from "../ranking/ranking.module";
import { ChanceModule } from "../chance/chance.module";

@Module({
  imports: [
    MikroOrmModule.forFeature([Drawing]),
    PromptModule,
    UserModule,
    PointModule,
    RankingModule,
    ChanceModule,
  ],
  controllers: [DrawingController],
  providers: [DrawingService, DrawingAccessService],
  exports: [DrawingAccessService],
})
export class DrawingModule {}
