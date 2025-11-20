import type { Response } from 'express';

import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getAttemptDetail, startAttempt, submitAttemptWithResponses } from '../services/attempt.service.js';
import { submitAttemptSchema } from '../validators/attempt.validator.js';

type AuthedRequest = AuthenticatedRequest;

export const createAttempt = async (req: AuthedRequest, res: Response) => {
  const quizId = Number(req.params.quizId || req.body.quizId);
  const attempt = await startAttempt(req.user!.id, quizId);
  res.status(201).json({ status: 'success', data: attempt });
};

export const submitAttempt = async (req: AuthedRequest, res: Response) => {
  const attemptId = Number(req.params.attemptId || req.params.id);
  const payload = submitAttemptSchema.parse(req.body);
  const attempt = await submitAttemptWithResponses(attemptId, payload.responses);
  res.json({ status: 'success', data: attempt });
};

export const getAttempt = async (req: AuthedRequest, res: Response) => {
  const attemptId = Number(req.params.attemptId || req.params.id);
  const attempt = await getAttemptDetail(attemptId);
  if (!attempt) {
    return res.status(404).json({ status: 'error', message: 'Attempt not found' });
  }
  if (req.user!.role === 'student' && attempt.attempt.studentId !== req.user!.id) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }
  res.json({ status: 'success', data: attempt });
};
