import { MikroOrmModule } from "@mikro-orm/nestjs";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { LoggerModule } from "nestjs-pino";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import config from "./mikro-orm.config";
import { AdModule } from "./modules/ad/ad.module";
import { DrawingModule } from "./modules/drawing/drawing.module";
import { PointModule } from "./modules/point/point.module";
import { PromptModule } from "./modules/prompt/prompt.module";
import { RankingModule } from "./modules/ranking/ranking.module";
import { UserModule } from "./modules/user/user.module";
import { RequestContextHelper } from "./common/middlewares/request-context-helper.middleware";

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get("NODE_ENV") === "production";
        return {
          pinoHttp: {
            level: isProduction ? "info" : "debug",
            transport: isProduction
              ? undefined
              : {
                  target: "pino-pretty",
                  options: {
                    singleLine: true,
                    translateTime: "SYS:standard",
                  },
                },
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    MikroOrmModule.forRoot(config),
    AuthModule,
    UserModule,
    DrawingModule,
    PromptModule,
    PointModule,
    AdModule,
    RankingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextHelper).forRoutes("*");
  }
}
