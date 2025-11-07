import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './db/migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './db/seeds'
    }
  },
  test: {
    client: 'mysql2',
    connection: {
      host: process.env.TEST_DB_HOST || process.env.DB_HOST,
      port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306),
      database: process.env.TEST_DB_NAME || `${process.env.DB_NAME}_test`,
      user: process.env.TEST_DB_USER || process.env.DB_USER,
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD
    },
    pool: {
      min: 1,
      max: 5
    },
    migrations: {
      directory: './db/migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './db/seeds'
    }
  }
};

export default config;
