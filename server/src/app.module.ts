import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GamePlayModule } from './game-play/game-play.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'], // ✅ 우선순위: local → default
    }),
    GamePlayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
