import { Controller, Get, Query } from "@nestjs/common";
import { DrawingService } from "./drawing.service";

@Controller("drawing")
export class DrawingController {
  constructor(private readonly drawingService: DrawingService) {}

  @Get("me")
  getMyDrawings(@Query() userId: string) {
    return userId;
  }

  @Get(":userId")
  getBestDrawing(@Query() userId: string) {
    return userId;
  }
}
