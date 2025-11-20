import { Router } from 'express';
import { addQuestion, analytics, assign, createQuiz, attempts, getQuiz, listQuizzes, removeQuestion, removeQuiz, togglePublish } from '../controllers/quiz.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
export const quizRouter = Router();
quizRouter.use(requireAuth);
quizRouter
    .route('/')
    .post(requireRoles(['teacher', 'admin']), asyncHandler(createQuiz))
    .get(asyncHandler(listQuizzes));
quizRouter
    .route('/:quizId')
    .get(asyncHandler(getQuiz))
    .delete(requireRoles(['teacher', 'admin']), asyncHandler(removeQuiz));
quizRouter
    .route('/:quizId/questions')
    .post(requireRoles(['teacher', 'admin']), asyncHandler(addQuestion));
quizRouter
    .route('/:quizId/questions/:questionId')
    .delete(requireRoles(['teacher', 'admin']), asyncHandler(removeQuestion));
quizRouter
    .route('/:quizId/publish')
    .patch(requireRoles(['teacher', 'admin']), asyncHandler(togglePublish));
quizRouter
    .route('/:quizId/assignments')
    .post(requireRoles(['teacher', 'admin']), asyncHandler(assign));
quizRouter
    .route('/:quizId/analytics')
    .get(requireRoles(['teacher', 'admin']), asyncHandler(analytics));
quizRouter
    .route('/:quizId/attempts')
    .get(requireRoles(['teacher', 'admin']), asyncHandler(attempts));
