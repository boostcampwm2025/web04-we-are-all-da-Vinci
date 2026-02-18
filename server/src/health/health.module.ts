import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { HealthController } from './health.controller';
import { PromptModule } from 'src/prompt/prompt.module';
import { HealthService } from './health.service';

@Module({
  imports: [RedisModule, PromptModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
