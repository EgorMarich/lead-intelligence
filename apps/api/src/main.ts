import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const port = Number(config.get('API_PORT', 3000));
  const prefix = config.get('API_PREFIX', 'api/v1');

  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.enableShutdownHooks();

  const corsOrigin = config.get<string>('CORS_ORIGIN', '*');
  app.enableCors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((item) => item.trim()), credentials: corsOrigin !== '*' });

  const swagger = new DocumentBuilder()
    .setTitle('Lead Intelligence API')
    .setDescription('B2B lead discovery, enrichment, outreach and analytics API')
    .setVersion('0.25.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(port, '0.0.0.0');
  console.log(JSON.stringify({ level: 'info', event: 'api_started', port, nodeEnv: config.get('NODE_ENV', 'development') }));
}

bootstrap().catch((error) => {
  console.error(JSON.stringify({ level: 'fatal', event: 'api_start_failed', error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
