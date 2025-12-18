import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOrigins } from './utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = getCorsOrigins(process.env.CORS_ORIGIN);

  app.enableCors({
    origin: origins.length ? origins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
