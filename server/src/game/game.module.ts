import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
