import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GamePlayModule } from './game-play/game-play.module';

@Module({
  imports: [GamePlayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
