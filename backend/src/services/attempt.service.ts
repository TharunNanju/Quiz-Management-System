import type { PoolConnection } from 'mysql2/promise';

import {
  createAttempt,
  getAttemptById,
  listResponsesForAttempt,
  recordResponse,
  submitAttempt
} from '../repositories/attempt.repository.js';
import { getQuizWithQuestions } from '../repositories/quiz.repository.js';
import { withTransaction } from '../utils/db.js';

export const startAttempt = async (
  studentId: number,
  quizId: number
) => {
  return createAttempt(studentId, quizId);
};

export interface ResponseInput {
  questionId: number;
  selectedOptionId?: number | null;
  responseText?: string | null;
}

export const submitAttemptWithResponses = async (
  attemptId: number,
  responses: ResponseInput[]
) => {
  return withTransaction(async (conn: PoolConnection) => {
    for (const response of responses) {
      await recordResponse(
        attemptId,
        response.questionId,
        {
          selectedOptionId: response.selectedOptionId ?? null,
          responseText: response.responseText ?? null
        },
        conn
      );
    }
    const attempt = await submitAttempt(attemptId, conn);
    return attempt;
  });
};

export const getAttemptDetail = async (attemptId: number) => {
  const attempt = await getAttemptById(attemptId);
  if (!attempt) return null;
  const responses = await listResponsesForAttempt(attemptId);
  const quiz = await getQuizWithQuestions(attempt.quizId);
  return { attempt, responses, quiz };
};
