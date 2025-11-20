import createPino from 'pino';
const logger = createPino({
    transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
    level: process.env.LOG_LEVEL || 'info'
});
export default logger;
