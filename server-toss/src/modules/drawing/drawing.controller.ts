import { Controller, Get, Param, Query } from "@nestjs/common";
import { DrawingService } from "./drawing.service";
import { DrawingMeDto, DrawingUserDto } from "./dto/drawing.dto";

@Controller("drawing")
export class DrawingController {
  constructor(private readonly drawingService: DrawingService) {}

  @Get("me")
  getMyDrawings(@Query() { userId }: DrawingMeDto) {
    return this.drawingService.getMyDrawings(userId);
  }

  @Get(":userId")
  getBestDrawing(@Param() { userId }: DrawingUserDto) {
    return this.drawingService.getBestDrawing(userId);
  }
}
