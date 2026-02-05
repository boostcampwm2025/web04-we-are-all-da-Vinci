import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { ChatModule } from './chat/chat.module';
import { GameModule } from './game/game.module';
import { MetricModule } from './metric/metric.module';
import { PlayModule } from './play/play.module';
import { PromptModule } from './prompt/prompt.module';
import { RedisModule } from './redis/redis.module';
import { RoundModule } from './round/round.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.test', '.env.local', '.env'], // ✅ 우선순위: test → local → default
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true, // 한 줄로 출력
                    translateTime: 'SYS:standard', // 시간 포맷 가독성 있게
                  },
                },
          },
        };
      },
    }),
    EventEmitterModule.forRoot({ delimiter: '_' }),
    RedisModule,
    GameModule,
    PlayModule,
    RoundModule,
    PromptModule,
    ChatModule,
    MetricModule,
  ],
})
export class AppModule {}
