import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  addQuestionToQuiz,
  assignQuiz,
  createQuizForTeacher,
  deleteQuestionFromQuiz,
  deleteQuizForUser,
  getQuizAnalytics,
  getQuizDetail,
  listQuizAttempts,
  listQuizzesForUser,
  publishQuiz
} from '../services/quiz.service.js';
import {
  addQuestionSchema,
  assignQuizSchema,
  createQuizSchema,
  publishQuizSchema
} from '../validators/quiz.validator.js';

type AuthedRequest = AuthenticatedRequest;

export const createQuiz = async (req: AuthedRequest, res: Response) => {
  const payload = createQuizSchema.parse({
    ...req.body,
    timeLimit: Number(req.body.timeLimit)
  });
  const normalizedPayload = {
    ...payload,
    startTime: payload.startTime ? new Date(payload.startTime) : null,
    endTime: payload.endTime ? new Date(payload.endTime) : null
  };
  const quiz = await createQuizForTeacher(req.user!.id, normalizedPayload);
  res.status(201).json({ status: 'success', data: quiz });
};

export const listQuizzes = async (req: AuthedRequest, res: Response) => {
  const { category } = req.query as { category?: string };
  const quizzes = await listQuizzesForUser({
    userId: req.user!.id,
    role: req.user!.role,
    category: category ?? undefined
  });
  res.json({ status: 'success', data: quizzes });
};

export const getQuiz = async (req: Request, res: Response) => {
  const quizId = Number(req.params.quizId || req.params.id);
  const quiz = await getQuizDetail(quizId);
  if (!quiz) {
    return res.status(404).json({ status: 'error', message: 'Quiz not found' });
  }
  res.json({ status: 'success', data: quiz });
};

export const addQuestion = async (req: AuthedRequest, res: Response) => {
  const quizId = Number(req.params.quizId || req.params.id);
  const payload = addQuestionSchema.parse({
    ...req.body,
    points: Number(req.body.points)
  });
  const question = await addQuestionToQuiz({ ...payload, quizId });
  res.status(201).json({ status: 'success', data: question });
};

export const togglePublish = async (req: AuthedRequest, res: Response) => {
  const quizId = Number(req.params.quizId || req.params.id);
  const { published } = publishQuizSchema.parse(req.body);
  await publishQuiz(quizId, published);
  res.json({ status: 'success', data: { quizId, published } });
};

export const assign = async (req: AuthedRequest, res: Response) => {
  const quizId = Number(req.params.quizId || req.params.id);
  const rawPayload = {
    studentId:
      req.body.studentId !== undefined && req.body.studentId !== null && req.body.studentId !== ''
        ? Number(req.body.studentId)
        : undefined,
    studentEmail:
      typeof req.body.studentEmail === 'string' && req.body.studentEmail.trim().length
        ? req.body.studentEmail.trim()
        : undefined,
    dueDate: req.body.dueDate ?? null
  };
  const payload = assignQuizSchema.parse(rawPayload);
  const assignment = await assignQuiz(
    quizId,
    { studentId: payload.studentId, studentEmail: payload.studentEmail },
    payload.dueDate ? new Date(payload.dueDate) : null
  );
  res.status(201).json({ status: 'success', data: assignment });
};

export const analytics = async (req: AuthedRequest, res: Response) => {
  const quizId = Number(req.params.quizId || req.params.id);
  const data = await getQuizAnalytics(quizId);
  res.json({ status: 'success', data });
};

export const attempts = async (req: AuthedRequest, res: Response) => {
  const quizId = Number(req.params.quizId || req.params.id);
  const data = await listQuizAttempts(quizId, { id: req.user!.id, role: req.user!.role });
  res.json({ status: 'success', data });
};

export const removeQuiz = async (req: AuthedRequest, res: Response) => {
  const quizId = Number(req.params.quizId || req.params.id);
  await deleteQuizForUser(quizId, { id: req.user!.id, role: req.user!.role });
  res.json({ status: 'success', data: { quizId } });
};

export const removeQuestion = async (req: AuthedRequest, res: Response) => {
  const quizId = Number(req.params.quizId || req.params.id);
  const questionId = Number(req.params.questionId);
  await deleteQuestionFromQuiz(quizId, questionId, { id: req.user!.id, role: req.user!.role });
  res.json({ status: 'success', data: { quizId, questionId } });
};
