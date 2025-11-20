import createPinoHttp from 'pino-http';

import logger from '../config/logger.js';

export const requestLogger = createPinoHttp({
  logger,
  autoLogging: process.env.NODE_ENV !== 'test'
});
