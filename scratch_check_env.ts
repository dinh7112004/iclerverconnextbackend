import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  console.log("MONGODB_URI:", config.get('MONGODB_URI'));
  await app.close();
}
bootstrap();
