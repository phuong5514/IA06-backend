import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestApplication } from '@nestjs/core';

export function setupSwagger(app: NestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Smart Restaurant API')
    .setDescription('API for Smart Restaurant QR-based ordering system')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('menu', 'Menu management endpoints')
    .addTag('tables', 'Table management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('payments', 'Payment processing endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
