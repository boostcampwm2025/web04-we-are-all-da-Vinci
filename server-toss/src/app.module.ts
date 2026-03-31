import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { UserModule } from './user/user.module';
import { DrawingModule } from './drawing/drawing.module';
import { PromptModule } from './prompt/prompt.module';
import { PointModule } from './point/point.module';
import { AdModule } from './ad/ad.module';
import config from "./mikro-orm.config";

@Module({
  imports: [
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
  ],
})
export class AppModule {}
