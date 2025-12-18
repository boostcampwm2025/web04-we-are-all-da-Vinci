import { Module } from '@nestjs/common';
import { GamePlayGateway } from './game-play.gateway';
import { GamePlayService } from './game-play.service';

@Module({
  providers: [GamePlayGateway, GamePlayService]
})
export class GamePlayModule {}
