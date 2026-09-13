import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.getHttpAdapter().get('/health', (_req: any, res: any) => res.json({ status: 'ok' }));
  await app.listen(3000);
  Logger.log('TripMatch API listening on 3000');
}
bootstrap();
