import { Controller, Get, Query } from "@nestjs/common";
import { DrawingService } from "./drawing.service";
import { TodayDrawingsDto } from "./dto/today-drawings.dto";

@Controller("today/drawings")
export class DrawingController {
  constructor(private readonly drawingService: DrawingService) {}

  @Get()
  async getTodayDrawings(@Query() dto: TodayDrawingsDto) {
    return this.drawingService.getTodayDrawings(dto.userId);
  }
}
