import { Module } from "@nestjs/common";
import { DrawingService } from "./drawing.service";
import { DrawingController } from "./drawing.controller";

@Module({
  controllers: [DrawingController],
  providers: [DrawingService],
})
export class DrawingModule {}
