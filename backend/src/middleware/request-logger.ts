import pinoHttp from 'pino-http';

import logger from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger,
  autoLogging: process.env.NODE_ENV !== 'test'
});
