import { Module } from '@nestjs/common';
import { PlayGateway } from './play.gateway';
import { PlayService } from './play.service';
import { RedisModule } from 'src/redis/redis.module';
import { MetricModule } from 'src/metric/metric.module';

@Module({
  providers: [PlayGateway, PlayService],
  imports: [RedisModule, MetricModule],
})
export class PlayModule {}
