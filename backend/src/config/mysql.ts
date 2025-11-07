import mysql, { Pool } from 'mysql2/promise';

import env from './env.js';
import logger from './logger.js';

let pool: Pool | null = null;

export const createDbPool = async (): Promise<Pool> => {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connection established');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    throw error;
  }

  return pool;
};

export const getDbPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
};
