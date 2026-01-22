import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { corsOriginCallback } from './common/config/cors.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 기본 로거를 pino로 교체
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: corsOriginCallback,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
