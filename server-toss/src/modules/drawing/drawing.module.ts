import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PromptModule } from "../prompt/prompt.module";
import { DrawingController } from "./drawing.controller";
import { Drawing } from "./drawing.entity";
import { DrawingService } from "./service/drawing.service";
import { DrawingAccessService } from "./service/drawing-access.service";
import { UserModule } from "../user/user.module";

@Module({
  imports: [MikroOrmModule.forFeature([Drawing]), PromptModule, UserModule],
  controllers: [DrawingController],
  providers: [DrawingService, DrawingAccessService],
  exports: [DrawingAccessService],
})
export class DrawingModule {}
