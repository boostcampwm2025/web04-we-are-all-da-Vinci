import { Controller, Get, Header } from '@nestjs/common';
import { MetricService } from './metric.service';

@Controller()
export class MetricController {
  constructor(private readonly metricService: MetricService) {}

  @Get('/metrics')
  @Header('Content-Type', MetricService.getContentType())
  async getMetrics() {
    return await this.metricService.getMetrics();
  }
}
