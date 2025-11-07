import type { PoolConnection } from 'mysql2/promise';

import {
  addQuestionWithOptions,
  createQuiz,
  getQuizWithQuestions,
  listQuizzes,
  setQuizPublished,
  type CreateQuestionInput,
  type Quiz
} from '../repositories/quiz.repository.js';
import { assignQuizToStudent } from '../repositories/assignment.repository.js';
import { findById as findUserById } from '../repositories/user.repository.js';
import { getDbPool } from '../config/mysql.js';
import { findByEmail as findUserByEmail } from '../repositories/user.repository.js';

export interface CreateQuizInput {
  title: string;
  description?: string | null;
  category?: string | null;
  timeLimit: number;
  startTime?: Date | null;
  endTime?: Date | null;
  published?: boolean;
}

export const createQuizForTeacher = async (
  creatorId: number,
  payload: CreateQuizInput,
  conn?: PoolConnection
): Promise<Quiz> => {
  const quiz = await createQuiz(
    {
      creatorId,
      title: payload.title,
      description: payload.description ?? null,
      category: payload.category ?? null,
      timeLimit: payload.timeLimit,
      startTime: payload.startTime ?? null,
      endTime: payload.endTime ?? null,
      published: payload.published ?? false
    },
    conn
  );
  return quiz;
};

export const listQuizzesForUser = async (params: {
  userId: number;
  role: 'teacher' | 'student' | 'admin';
  category?: string;
}): Promise<Quiz[]> => {
  if (params.role === 'teacher') {
    return listQuizzes({ creatorId: params.userId, category: params.category });
  }
  if (params.role === 'admin') {
    return listQuizzes({ category: params.category });
  }
  return listQuizzes({ assignedStudentId: params.userId, category: params.category, published: true });
};

export const addQuestionToQuiz = async (payload: CreateQuestionInput, conn?: PoolConnection) => {
  return addQuestionWithOptions(payload, conn);
};

export const publishQuiz = async (quizId: number, published: boolean, conn?: PoolConnection) => {
  await setQuizPublished(quizId, published, conn);
};

interface AssignTarget {
  studentId?: number;
  studentEmail?: string;
}

export const assignQuiz = async (
  quizId: number,
  target: AssignTarget,
  dueDate?: Date | null
) => {
  let student = null;

  if (target.studentId !== undefined) {
    student = await findUserById(target.studentId);
  } else if (target.studentEmail) {
    student = await findUserByEmail(target.studentEmail);
  }

  if (!student) {
    const error = new Error('Student not found');
    (error as any).statusCode = 404;
    throw error;
  }

  if (student.role !== 'student') {
    const error = new Error('Only student accounts can receive assignments');
    (error as any).statusCode = 400;
    throw error;
  }

  return assignQuizToStudent(quizId, student.userId, dueDate ?? null);
};

export const getQuizDetail = async (quizId: number) => {
  return getQuizWithQuestions(quizId);
};

export interface QuizAnalytics {
  averageScore: number;
  attemptCount: number;
  completionRate: number;
}

export const getQuizAnalytics = async (quizId: number): Promise<QuizAnalytics> => {
  const pool = getDbPool();
  const [[row]]: any[] = await pool.query(
    `SELECT 
        COUNT(*) AS attemptCount,
        SUM(CASE WHEN Status = 'submitted' OR Status = 'graded' THEN 1 ELSE 0 END) AS completedCount
      FROM Attempts WHERE QuizID = ?`,
    [quizId]
  );

  const attemptCount = Number(row?.attemptCount ?? 0);
  const completedCount = Number(row?.completedCount ?? 0);
  const [[averageRow]]: any[] = await pool.query(
    `SELECT IFNULL(AVG(Score), 0) AS averageScore FROM Attempts WHERE QuizID = ? AND Score IS NOT NULL`,
    [quizId]
  );
  const averageScore = Number(averageRow?.averageScore ?? 0);
  const completionRate = attemptCount === 0 ? 0 : completedCount / attemptCount;

  return {
    averageScore,
    attemptCount,
    completionRate
  };
};
