import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Serve toàn bộ thư mục public (bao gồm /avatars, /homework, /others...)
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Increase body limit
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }));
  app.use(compression());

  // CORS
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });


  // Global prefix
  const apiPrefix = configService.get('API_PREFIX') || '/api/v1';
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation - Always enable for hand-off
  const config = new DocumentBuilder()
    .setTitle('SLL Electronic System API')
    .setDescription('Smart Electronic Communication Book System - AI Version')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & Authorization')
    .addTag('users', 'User Management')
    .addTag('students', 'Student Management')
    .addTag('teachers', 'Teacher Management')
    .addTag('parents', 'Parent Management')
    .addTag('classes', 'Class Management')
    .addTag('attendance', 'Attendance Management')
    .addTag('grades', 'Grades Management')
    .addTag('homework', 'Homework Management')
    .addTag('communication', 'Communication & Messaging')
    .addTag('finance', 'Finance & Payments')
    .addTag('materials', 'Learning Materials')
    .addTag('ai', 'AI Services')
    .addTag('reports', 'Reports & Analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);


  const port = process.env.PORT || configService.get('API_PORT') || 3000;
  await app.listen(port);

  console.log(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   🚀 SLL Electronic System API is running!               ║
    ║                                                           ║
    ║   🌍 Server:      http://localhost:${port}                     ║
    ║   📚 API Docs:    http://localhost:${port}/api/docs            ║
    ║   🔧 Environment: ${configService.get('NODE_ENV')}                           ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
