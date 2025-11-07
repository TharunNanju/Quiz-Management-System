import { Router } from 'express';

import { login, refresh, register } from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/refresh', asyncHandler(refresh));
