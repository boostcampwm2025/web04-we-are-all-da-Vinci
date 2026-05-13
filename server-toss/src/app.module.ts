import { MikroOrmModule } from "@mikro-orm/nestjs";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { LoggerModule } from "nestjs-pino";
import { validateChanceWhitelistEnv } from "./common/config/env.validation";
import { createLoggerParams } from "./common/logging/logger.config";
import { RequestContextHelper } from "./common/middleware/request-context-helper.middleware";
import { HealthModule } from "./health/health.module";
import config from "./mikro-orm.config";
import { AuthModule } from "./modules/auth/auth.module";
import { ChanceModule } from "./modules/chance/chance.module";
import { DrawingModule } from "./modules/drawing/drawing.module";
import { PointModule } from "./modules/point/point.module";
import { PlayModule } from "./modules/play/play.module";
import { PromptModule } from "./modules/prompt/prompt.module";
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
    MikroOrmModule.forRoot(config),
    AuthModule,
    UserModule,
    DrawingModule,
    PromptModule,
    PointModule,
    PlayModule,
    ChanceModule,
    RankingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextHelper).forRoutes("*");
  }
}
