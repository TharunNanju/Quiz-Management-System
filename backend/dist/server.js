import http from 'http';
import app from './app.js';
import logger from './config/logger.js';
import { createDbPool } from './config/mysql.js';
const port = Number(process.env.PORT || 4000);
async function bootstrap() {
    try {
        await createDbPool();
        const server = http.createServer(app);
        server.listen(port, () => {
            logger.info({ port }, 'Server listening');
        });
        const shutdown = () => {
            logger.info('Shutting down server');
            server.close(() => {
                logger.info('HTTP server closed');
            });
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to bootstrap application');
        process.exit(1);
    }
}
bootstrap();
