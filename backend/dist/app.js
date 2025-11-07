import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './config/logger';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth.routes';
import { quizRouter } from './routes/quiz.routes';
import { attemptRouter } from './routes/attempt.routes';
import { healthRouter } from './routes/health.routes';
const app = express();
const corsOrigin = process.env.APP_URL || 'http://localhost:5173';
app.use(cors({
    origin: corsOrigin,
    credentials: true
}));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/quizzes', quizRouter);
app.use('/api/v1/attempts', attemptRouter);
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});
app.use(errorHandler);
app.on('ready', () => logger.info('Express app ready'));
export default app;
