import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { AppLogger } from './infrastructure/logger';
import { LoggingInterceptor } from './infrastructure/logging.interceptor';
import { MetricsService } from './infrastructure/metrics';
import { setupSwagger } from './docs/openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Set custom logger
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  // Enable cookie parser
  app.use(cookieParser());

  // Add global logging interceptor
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new LoggingInterceptor(logger, metricsService));

  // Configure CORS for both development and production
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  // Add production URLs if they exist
  if (process.env.PRODUCTION_FRONTEND_URL) {
    allowedOrigins.push(process.env.PRODUCTION_FRONTEND_URL);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      if (
        allowedOrigins.some((allowed) => origin.startsWith(allowed)) ||
        origin.includes('vercel.app') ||
        origin.includes('netlify.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie', 'X-Request-ID'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Setup Swagger documentation
  setupSwagger(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
}
bootstrap();
