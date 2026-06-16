import { MikroOrmModule } from "@mikro-orm/nestjs";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { LoggerModule } from "nestjs-pino";
import { validateChanceWhitelistEnv } from "./common/config/env.validation";
import { createLoggerParams } from "./common/logging/logger.config";
import { RequestContextHelper } from "./common/middleware/request-context-helper.middleware";
import { ExternalModule } from "./external/external.module";
import { HealthModule } from "./health/health.module";
import config from "./mikro-orm.config";
import { ArchiveModule } from "./modules/archive/archive.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ChanceModule } from "./modules/chance/chance.module";
import { DrawingModule } from "./modules/drawing/drawing.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { PlayModule } from "./modules/play/play.module";
import { PointModule } from "./modules/point/point.module";
import { PromptModule } from "./modules/prompt/prompt.module";
import { MissionModule } from "./modules/mission/mission.module";
import { RankingModule } from "./modules/ranking/ranking.module";
import { UserModule } from "./modules/user/user.module";

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validate: validateChanceWhitelistEnv,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return createLoggerParams({
          nodeEnv: configService.get<string>("NODE_ENV"),
          logLevel: configService.get<string>("LOG_LEVEL"),
        });
      },
    }),
    ScheduleModule.forRoot(),
    // 도메인 이벤트 발행/구독. ranking.changed처럼 트랜잭션 커밋 후 비동기
    // 후처리(알림 발송 등)에 사용. in-memory이므로 프로세스 재시작 시 처리 중
    // 이벤트는 손실되는 한계 존재 — 큐 도입 시점에 BullMQ로 이행 호환.
    EventEmitterModule.forRoot(),
    MikroOrmModule.forRoot(config),
    ExternalModule.register(),
    AuthModule,
    ArchiveModule,
    UserModule,
    DrawingModule,
    PromptModule,
    PointModule,
    PlayModule,
    ChanceModule,
    RankingModule,
    MissionModule,
    NotificationModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextHelper).forRoutes("*");
  }
}
