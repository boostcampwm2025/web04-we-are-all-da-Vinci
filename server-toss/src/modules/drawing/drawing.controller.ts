import { Controller, Get, Param, Query } from "@nestjs/common";
import { DrawingService } from "./drawing.service";

@Controller("drawing")
export class DrawingController {
  constructor(private readonly drawingService: DrawingService) {}

  @Get("me")
  getMyDrawings(@Query() { userId }: { userId: string }) {
    return this.drawingService.getMyDrawings(userId);
  }

  @Get(":userId")
  getBestDrawing(@Param("userId") userId: string) {
    return this.drawingService.getBestDrawing(userId);
  }
}
