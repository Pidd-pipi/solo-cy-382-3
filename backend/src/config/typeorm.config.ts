import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeormConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  username: process.env.DATABASE_USER ?? 'tripmatch',
  password: process.env.DATABASE_PASSWORD ?? 'tripmatch_pass',
  database: process.env.DATABASE_NAME ?? 'tripmatch',
  autoLoadEntities: true,
  synchronize: true
});
