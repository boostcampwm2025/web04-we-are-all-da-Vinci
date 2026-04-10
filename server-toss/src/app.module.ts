import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { HealthModule } from "./health/health.module";
import { UserModule } from "./modules/user/user.module";
import { DrawingModule } from "./modules/drawing/drawing.module";
import { PromptModule } from "./modules/prompt/prompt.module";
import { PointModule } from "./modules/point/point.module";
import { AdModule } from "./modules/ad/ad.module";
import { RankingModule } from "./modules/ranking/ranking.module";
import config from "./mikro-orm.config";

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
    MikroOrmModule.forRoot(config),
    UserModule,
    DrawingModule,
    PromptModule,
    PointModule,
    AdModule,
    RankingModule,
  ],
})
export class AppModule {}
