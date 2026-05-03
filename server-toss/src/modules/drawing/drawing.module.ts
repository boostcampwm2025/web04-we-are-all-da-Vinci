import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointModule } from "../point/point.module";
import { PromptModule } from "../prompt/prompt.module";
import { User } from "../user/user.entity";
import { DrawingController } from "./drawing.controller";
import { Drawing } from "./drawing.entity";
import { DrawingService } from "./drawing.service";

@Module({
  imports: [
    MikroOrmModule.forFeature([Drawing, User]),
    PromptModule,
    PointModule,
  ],
  controllers: [DrawingController],
  providers: [DrawingService],
})
export class DrawingModule {}
