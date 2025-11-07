import { Router, type Request, type Response } from 'express';

import env from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});
