import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: (() => {
    const url = configService.get('DATABASE_URL');
    if (!url && configService.get('NODE_ENV') === 'production') {
      console.error('❌ CRITICAL: DATABASE_URL is missing in production environment!');
    }
    return url;
  })(),
  entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
  autoLoadEntities: true,
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
  ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
  schema: 'public',
  extra: {
    max: 50,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
});

// For TypeORM CLI
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
