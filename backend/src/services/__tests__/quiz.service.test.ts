import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  default: {
    NODE_ENV: 'test',
    PORT: '4000',
    APP_URL: 'http://localhost:5173',
    JWT_SECRET: 'testsecretkeytestsecret',
    JWT_REFRESH_SECRET: 'testrefreshsecret1234',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    DB_HOST: 'localhost',
    DB_PORT: 3306,
    DB_NAME: 'test_db',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_password',
    TEST_DB_HOST: 'localhost',
    TEST_DB_PORT: '3306',
    TEST_DB_NAME: 'test_db',
    TEST_DB_USER: 'test_user',
    TEST_DB_PASSWORD: 'test_password'
  }
}));

import type { Quiz, Question } from '../../repositories/quiz.repository.js';
import {
  deleteQuestionForQuiz,
  deleteQuizById,
  getQuestionById,
  getQuizById
} from '../../repositories/quiz.repository.js';
import {
  deleteQuestionFromQuiz,
  deleteQuizForUser
} from '../quiz.service.js';

vi.mock('../../repositories/quiz.repository.js', () => ({
  addQuestionWithOptions: vi.fn(),
  createQuiz: vi.fn(),
  getQuizWithQuestions: vi.fn(),
  listQuizzes: vi.fn(),
  setQuizPublished: vi.fn(),
  getQuizById: vi.fn(),
  deleteQuizById: vi.fn(),
  getQuestionById: vi.fn(),
  deleteQuestionForQuiz: vi.fn()
}));

vi.mock('../../repositories/assignment.repository.js', () => ({
  assignQuizToStudent: vi.fn()
}));

vi.mock('../../repositories/user.repository.js', () => ({
  findById: vi.fn(),
  findByEmail: vi.fn()
}));

const mockQuiz = (overrides: Partial<Quiz> = {}): Quiz => ({
  quizId: overrides.quizId ?? 1,
  creatorId: overrides.creatorId ?? 10,
  title: overrides.title ?? 'Sample',
  description: overrides.description ?? null,
  category: overrides.category ?? null,
  timeLimit: overrides.timeLimit ?? 600,
  startTime: overrides.startTime ?? null,
  endTime: overrides.endTime ?? null,
  published: overrides.published ?? false,
  createdAt: overrides.createdAt ?? new Date()
});

const mockQuestion = (overrides: Partial<Question> = {}): Question => ({
  questionId: overrides.questionId ?? 1,
  quizId: overrides.quizId ?? 1,
  questionType: overrides.questionType ?? 'mcq',
  questionText: overrides.questionText ?? 'Placeholder',
  points: overrides.points ?? 1,
  difficulty: overrides.difficulty ?? null,
  tags: overrides.tags ?? null
});

describe('quiz.service deletion helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('throws when quiz is missing during delete', async () => {
    vi.mocked(getQuizById).mockResolvedValueOnce(null);

    await expect(deleteQuizForUser(1, { id: 99, role: 'admin' })).rejects.toThrow('Quiz not found');
  });

  it('prevents teachers from deleting quizzes they do not own', async () => {
    vi.mocked(getQuizById).mockResolvedValueOnce(mockQuiz({ creatorId: 55 }));

    await expect(deleteQuizForUser(4, { id: 10, role: 'teacher' })).rejects.toThrow('Forbidden');
  });

  it('allows admins to delete any quiz', async () => {
    vi.mocked(getQuizById).mockResolvedValueOnce(mockQuiz({ quizId: 7 }));

    await deleteQuizForUser(7, { id: 1, role: 'admin' });

    expect(deleteQuizById).toHaveBeenCalledWith(7);
  });

  it('removes a question that belongs to the quiz', async () => {
    vi.mocked(getQuizById).mockResolvedValue(mockQuiz({ quizId: 12, creatorId: 3 }));
    vi.mocked(getQuestionById).mockResolvedValue(mockQuestion({ questionId: 9, quizId: 12 }));

    await deleteQuestionFromQuiz(12, 9, { id: 3, role: 'teacher' });

    expect(deleteQuestionForQuiz).toHaveBeenCalledWith(12, 9);
  });

  it('throws when attempting to delete a question from another quiz', async () => {
    vi.mocked(getQuizById).mockResolvedValue(mockQuiz({ quizId: 5, creatorId: 2 }));
    vi.mocked(getQuestionById).mockResolvedValue(mockQuestion({ quizId: 99 }));

    await expect(deleteQuestionFromQuiz(5, 9, { id: 2, role: 'teacher' })).rejects.toThrow('Question not found');
    expect(deleteQuestionForQuiz).not.toHaveBeenCalled();
  });
});
