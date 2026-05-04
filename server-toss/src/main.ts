import { MikroORM } from "@mikro-orm/mysql";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import "reflect-metadata";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { ZodExceptionFilter } from "./common/zod-exception.filter";
import { PromptSeedService } from "./modules/prompt/prompt.seed";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new ZodExceptionFilter(), new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  const options = new DocumentBuilder()
    .setTitle("DaVinci Toss Server API")
    .setDescription("DaVinci Toss Server API description")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("/docs", app, document);

  if (process.env.NODE_ENV !== "production") {
    const orm = app.get<MikroORM>(MikroORM);
    await orm.migrator.up();
  }

  await app.get(PromptSeedService).run();

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
