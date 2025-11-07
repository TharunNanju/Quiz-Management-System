import { ZodError } from 'zod';
import logger from '../config/logger.js';
export const errorHandler = (err, _, res, __) => {
    if (err instanceof ZodError) {
        const zodError = err;
        const details = zodError.flatten();
        logger.warn({ err: zodError }, 'Validation error');
        return res.status(400).json({
            status: 'error',
            message: 'Validation error',
            details
        });
    }
    const apiError = err;
    const statusCode = apiError.statusCode || 500;
    const message = apiError.message || 'Internal Server Error';
    logger.error({ err: apiError }, 'Request failed');
    res.status(statusCode).json({
        status: 'error',
        message,
        details: apiError.details
    });
};
