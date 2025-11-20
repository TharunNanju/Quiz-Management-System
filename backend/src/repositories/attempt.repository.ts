import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

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

interface AttemptRow extends RowDataPacket {
  AttemptID: number;
  StudentID: number;
  QuizID: number;
  StartTime: Date;
  EndTime: Date | null;
  Score: number | null;
  Status: Attempt['status'] | null;
}

interface ResponseRow extends RowDataPacket {
  ResponseID: number;
  AttemptID: number;
  QuestionID: number;
  SelectedOptionID: number | null;
  ResponseText: string | null;
  IsCorrect: number | null;
  AwardedPoints: number | null;
}

interface ScoreRow extends RowDataPacket {
  totalScore: number | string | null;
}

interface MysqlError extends Error {
  code?: string;
}

const mapAttempt = (row: AttemptRow): Attempt => ({
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
  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO Attempts (StudentID, QuizID, Status) VALUES (?, ?, 'in_progress')`,
    [studentId, quizId]
  );
  if (!conn) executor.release();
  const attemptId = result.insertId;
  const attempt = await getAttemptById(attemptId);
  if (!attempt) throw new Error('Failed to create attempt');
  return attempt;
};

export const getAttemptById = async (
  attemptId: number,
  conn?: PoolConnection
): Promise<Attempt | null> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [rows] = await executor.execute<AttemptRow[]>(
    `SELECT * FROM Attempts WHERE AttemptID = ?`,
    [attemptId]
  );
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
  try {
    const [result] = await executor.execute<ResultSetHeader>(
      `INSERT INTO Responses (AttemptID, QuestionID, SelectedOptionID, ResponseText)
       VALUES (?, ?, ?, ?)`.replace(/\s+/g, ' '),
      [attemptId, questionId, payload.selectedOptionId ?? null, payload.responseText ?? null]
    );
    const responseId = result.insertId;
    const response = await getResponseById(responseId, executor);
    if (!response) throw new Error('Failed to record response');
    return response;
  } finally {
    if (!conn) {
      executor.release();
    }
  }
};

export const getResponseById = async (
  responseId: number,
  conn?: PoolConnection
): Promise<ResponseRecord | null> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [rows] = await executor.execute<ResponseRow[]>(
    `SELECT * FROM Responses WHERE ResponseID = ?`,
    [responseId]
  );
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
  const [rows] = await pool.execute<ResponseRow[]>(
    `SELECT * FROM Responses WHERE AttemptID = ?`,
    [attemptId]
  );
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    responseId: row.ResponseID,
    attemptId: row.AttemptID,
    questionId: row.QuestionID,
    selectedOptionId: row.SelectedOptionID ?? null,
    responseText: row.ResponseText ?? null,
    isCorrect: row.IsCorrect === null ? null : Boolean(row.IsCorrect),
    awardedPoints: row.AwardedPoints ?? null
  }));
};

const isMissingScoreProcedureError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const maybeMysqlError = error as MysqlError;
  return maybeMysqlError.code === 'ER_SP_DOES_NOT_EXIST';
};

const updateAttemptScoreInline = async (
  executor: PoolConnection,
  attemptId: number
): Promise<void> => {
  const [rows] = await executor.query<ScoreRow[]>(
    `SELECT IFNULL(SUM(
        COALESCE(r.AwardedPoints,
          CASE
            WHEN r.SelectedOptionID IS NOT NULL AND o.IsCorrect = 1 THEN q.Points
            WHEN r.SelectedOptionID IS NOT NULL THEN 0
            ELSE 0
          END
        )
      ), 0) AS totalScore
     FROM Responses r
     JOIN Questions q ON q.QuestionID = r.QuestionID
     LEFT JOIN Options o ON o.OptionID = r.SelectedOptionID
     WHERE r.AttemptID = ?`,
    [attemptId]
  );
  const totalScore = Number(rows[0]?.totalScore ?? 0);
  await executor.execute(
    `UPDATE Attempts
     SET
       Score = ?,
       EndTime = CASE
         WHEN EndTime IS NULL THEN NOW()
         ELSE EndTime
       END
     WHERE AttemptID = ?`,
    [totalScore, attemptId]
  );
};

export const submitAttempt = async (
  attemptId: number,
  conn?: PoolConnection
): Promise<Attempt> => {
  const executor = conn ?? (await getDbPool().getConnection());
  let attempt: Attempt | null = null;
  try {
    try {
      await executor.query(`CALL CalculateAttemptScore(?)`, [attemptId]);
    } catch (error) {
      if (isMissingScoreProcedureError(error)) {
        await updateAttemptScoreInline(executor, attemptId);
      } else {
        throw error;
      }
    }
    await executor.execute(`UPDATE Attempts SET Status = 'submitted' WHERE AttemptID = ?`, [attemptId]);
    attempt = await getAttemptById(attemptId, executor);
  } finally {
    if (!conn) {
      executor.release();
    }
  }
  if (!attempt) throw new Error('Attempt not found after submission');
  return attempt;
};

export const listAttemptsForQuiz = async (quizId: number): Promise<Attempt[]> => {
  const pool = getDbPool();
  const [rows] = await pool.execute<AttemptRow[]>(
    `SELECT * FROM Attempts WHERE QuizID = ? ORDER BY StartTime DESC`,
    [quizId]
  );
  return Array.isArray(rows) ? rows.map(mapAttempt) : [];
};
