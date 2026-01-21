import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
