import type { PoolConnection } from 'mysql2/promise';

import { getDbPool } from '../config/mysql.js';

export interface Attempt {
  attemptId: number;
  studentId: number;
  quizId: number;
  startTime: Date;
  endTime: Date | null;
  score: number | null;
  status: 'in_progress' | 'submitted' | 'graded';
}

export interface ResponseRecord {
  responseId: number;
  attemptId: number;
  questionId: number;
  selectedOptionId: number | null;
  responseText: string | null;
  isCorrect: boolean | null;
  awardedPoints: number | null;
}

const mapAttempt = (row: any): Attempt => ({
  attemptId: row.AttemptID,
  studentId: row.StudentID,
  quizId: row.QuizID,
  startTime: row.StartTime,
  endTime: row.EndTime ?? null,
  score: row.Score ?? null,
  status: row.Status ?? 'in_progress'
});

export const createAttempt = async (
  studentId: number,
  quizId: number,
  conn?: PoolConnection
): Promise<Attempt> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [result] = await executor.execute(
    `INSERT INTO Attempts (StudentID, QuizID, Status) VALUES (?, ?, 'in_progress')`,
    [studentId, quizId]
  );
  if (!conn) executor.release();
  const attemptId = (result as any).insertId as number;
  const attempt = await getAttemptById(attemptId);
  if (!attempt) throw new Error('Failed to create attempt');
  return attempt;
};

export const getAttemptById = async (
  attemptId: number,
  conn?: PoolConnection
): Promise<Attempt | null> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [rows] = await executor.execute(`SELECT * FROM Attempts WHERE AttemptID = ?`, [attemptId]);
  if (!conn) executor.release();
  const row = Array.isArray(rows) ? rows[0] : undefined;
  return row ? mapAttempt(row) : null;
};

export const recordResponse = async (
  attemptId: number,
  questionId: number,
  payload: { selectedOptionId?: number | null; responseText?: string | null },
  conn?: PoolConnection
): Promise<ResponseRecord> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [result] = await executor.execute(
    `INSERT INTO Responses (AttemptID, QuestionID, SelectedOptionID, ResponseText)
     VALUES (?, ?, ?, ?)`.replace(/\s+/g, ' '),
    [attemptId, questionId, payload.selectedOptionId ?? null, payload.responseText ?? null]
  );
  if (!conn) executor.release();
  const responseId = (result as any).insertId as number;
  const response = await getResponseById(responseId);
  if (!response) throw new Error('Failed to record response');
  return response;
};

export const getResponseById = async (
  responseId: number,
  conn?: PoolConnection
): Promise<ResponseRecord | null> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [rows] = await executor.execute(`SELECT * FROM Responses WHERE ResponseID = ?`, [responseId]);
  if (!conn) executor.release();
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) return null;
  return {
    responseId: row.ResponseID,
    attemptId: row.AttemptID,
    questionId: row.QuestionID,
    selectedOptionId: row.SelectedOptionID ?? null,
    responseText: row.ResponseText ?? null,
    isCorrect: row.IsCorrect === null ? null : Boolean(row.IsCorrect),
    awardedPoints: row.AwardedPoints ?? null
  };
};

export const listResponsesForAttempt = async (
  attemptId: number
): Promise<ResponseRecord[]> => {
  const pool = getDbPool();
  const [rows] = await pool.execute(`SELECT * FROM Responses WHERE AttemptID = ?`, [attemptId]);
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any) => ({
    responseId: row.ResponseID,
    attemptId: row.AttemptID,
    questionId: row.QuestionID,
    selectedOptionId: row.SelectedOptionID ?? null,
    responseText: row.ResponseText ?? null,
    isCorrect: row.IsCorrect === null ? null : Boolean(row.IsCorrect),
    awardedPoints: row.AwardedPoints ?? null
  }));
};

export const submitAttempt = async (
  attemptId: number,
  conn?: PoolConnection
): Promise<Attempt> => {
  const executor = conn ?? (await getDbPool().getConnection());
  await executor.query(`CALL CalculateAttemptScore(?)`, [attemptId]);
  await executor.execute(`UPDATE Attempts SET Status = 'submitted' WHERE AttemptID = ?`, [attemptId]);
  if (!conn) executor.release();
  const attempt = await getAttemptById(attemptId);
  if (!attempt) throw new Error('Attempt not found after submission');
  return attempt;
};

export const listAttemptsForQuiz = async (quizId: number): Promise<Attempt[]> => {
  const pool = getDbPool();
  const [rows] = await pool.execute(`SELECT * FROM Attempts WHERE QuizID = ? ORDER BY StartTime DESC`, [
    quizId
  ]);
  return Array.isArray(rows) ? rows.map(mapAttempt) : [];
};
