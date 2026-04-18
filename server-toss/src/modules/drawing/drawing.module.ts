import { Module } from "@nestjs/common";
import { DrawingService } from "./drawing.service";
import { DrawingController } from "./drawing.controller";
import { DrawingRepository } from "./drawing.repository";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Drawing } from "./drawing.entity";

@Module({
  imports: [MikroOrmModule.forFeature([Drawing])],
  controllers: [DrawingController],
  providers: [DrawingService, DrawingRepository],
})
export class DrawingModule {}
