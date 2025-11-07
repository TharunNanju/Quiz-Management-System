import { Router } from 'express';
import { createAttempt, getAttempt, submitAttempt } from '../controllers/attempt.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
export const attemptRouter = Router();
attemptRouter.use(requireAuth);
attemptRouter.post('/quiz/:quizId', requireRoles(['student']), asyncHandler(createAttempt));
attemptRouter.patch('/:attemptId', requireRoles(['student']), asyncHandler(submitAttempt));
attemptRouter.get('/:attemptId', requireRoles(['student', 'teacher', 'admin']), asyncHandler(getAttempt));
