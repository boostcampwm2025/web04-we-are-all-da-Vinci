import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { MikroORM } from "@mikro-orm/mysql";
import { MikroOrmModule } from "@mikro-orm/nestjs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.enableShutdownHooks();

  const orm = app.get<MikroORM>(MikroORM);
  await orm.migrator.up();
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
