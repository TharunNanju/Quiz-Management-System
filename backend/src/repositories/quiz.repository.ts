import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { getDbPool } from '../config/mysql.js';

export interface Quiz {
  quizId: number;
  creatorId: number;
  title: string;
  description: string | null;
  category: string | null;
  timeLimit: number;
  startTime: Date | null;
  endTime: Date | null;
  published: boolean;
  createdAt: Date;
}

export type QuestionType = 'mcq' | 'short_answer' | 'true_false';

export interface Question {
  questionId: number;
  quizId: number;
  questionType: QuestionType;
  questionText: string;
  points: number;
  difficulty: string | null;
  tags: string | null;
}

export interface Option {
  optionId: number;
  questionId: number;
  optionText: string;
  isCorrect: boolean;
  feedback: string | null;
}

interface QuizRow extends RowDataPacket {
  QuizID: number;
  CreatorID: number;
  Title: string;
  Description: string | null;
  Category: string | null;
  TimeLimit: number;
  StartTime: Date | null;
  EndTime: Date | null;
  Published: number;
  CreatedAt: Date;
}

interface QuestionRow extends RowDataPacket {
  QuestionID: number;
  QuizID: number;
  QuestionType: QuestionType;
  QuestionText: string;
  Points: number;
  Difficulty: string | null;
  TagList: string | null;
}

interface OptionRow extends RowDataPacket {
  OptionID: number;
  QuestionID: number;
  OptionText: string;
  IsCorrect: number;
  Feedback: string | null;
}

const mapQuiz = (row: QuizRow): Quiz => ({
  quizId: row.QuizID,
  creatorId: row.CreatorID,
  title: row.Title,
  description: row.Description ?? null,
  category: row.Category ?? null,
  timeLimit: row.TimeLimit,
  startTime: row.StartTime ?? null,
  endTime: row.EndTime ?? null,
  published: Boolean(row.Published),
  createdAt: row.CreatedAt
});

export const createQuiz = async (
  data: Omit<Quiz, 'quizId' | 'createdAt' | 'published'> & { published?: boolean },
  conn?: PoolConnection
): Promise<Quiz> => {
  const executor = conn ?? (await getDbPool().getConnection());

  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO Quizzes (CreatorID, Title, Description, Category, TimeLimit, StartTime, EndTime, Published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, ' '),
    [
      data.creatorId,
      data.title,
      data.description,
      data.category,
      data.timeLimit,
      data.startTime,
      data.endTime,
      data.published ?? false
    ]
  );

  const quizId = result.insertId;
  if (!conn) {
    executor.release();
  }
  const quiz = await getQuizById(quizId, conn);
  if (!quiz) {
    throw new Error('Failed to fetch created quiz');
  }
  return quiz;
};

export interface QuizListFilters {
  creatorId?: number;
  assignedStudentId?: number;
  published?: boolean;
  category?: string;
}

export const listQuizzes = async (filters: QuizListFilters = {}): Promise<Quiz[]> => {
  const pool = getDbPool();
  let query = `SELECT DISTINCT q.* FROM Quizzes q`;
  const conditions: string[] = [];
  const params: Array<number | string | boolean> = [];

  if (filters.assignedStudentId) {
    query += ' LEFT JOIN QuizAssignments qa ON qa.QuizID = q.QuizID';
    conditions.push('(qa.StudentID = ? OR q.Published = 1)');
    params.push(filters.assignedStudentId);
  }

  if (filters.creatorId) {
    conditions.push('q.CreatorID = ?');
    params.push(filters.creatorId);
  }

  if (filters.published !== undefined) {
    conditions.push('q.Published = ?');
    params.push(filters.published ? 1 : 0);
  }

  if (filters.category) {
    conditions.push('q.Category = ?');
    params.push(filters.category);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY q.CreatedAt DESC';

  const [rows] = await pool.query<QuizRow[]>(query, params);
  return Array.isArray(rows) ? rows.map(mapQuiz) : [];
};

export const getQuizById = async (
  quizId: number,
  conn?: PoolConnection
): Promise<Quiz | null> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [rows] = await executor.execute<QuizRow[]>(
    `SELECT * FROM Quizzes WHERE QuizID = ? LIMIT 1`,
    [quizId]
  );
  if (!conn) {
    executor.release();
  }
  const row = Array.isArray(rows) ? rows[0] : undefined;
  return row ? mapQuiz(row) : null;
};

export interface CreateQuestionInput {
  quizId: number;
  questionType: QuestionType;
  questionText: string;
  points: number;
  difficulty?: string | null;
  tags?: string | null;
  options?: Array<{ optionText: string; isCorrect: boolean; feedback?: string | null }>;
}

export const addQuestionWithOptions = async (
  input: CreateQuestionInput,
  conn?: PoolConnection
): Promise<Question> => {
  const executor = conn ?? (await getDbPool().getConnection());

  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO Questions (QuizID, QuestionType, QuestionText, Points, Difficulty, TagList)
     VALUES (?, ?, ?, ?, ?, ?)`.replace(/\s+/g, ' '),
    [
      input.quizId,
      input.questionType,
      input.questionText,
      input.points,
      input.difficulty ?? null,
      input.tags ?? null
    ]
  );

  const questionId = result.insertId;

  if (input.options?.length) {
    const values = input.options.map((option) => [
      questionId,
      option.optionText,
      option.isCorrect ? 1 : 0,
      option.feedback ?? null
    ]);
    await executor.query(
      `INSERT INTO Options (QuestionID, OptionText, IsCorrect, Feedback) VALUES ?`,
      [values]
    );
  }

  if (!conn) {
    executor.release();
  }

  const [questionRows] = await getDbPool().execute<QuestionRow[]>(
    `SELECT * FROM Questions WHERE QuestionID = ?`,
    [questionId]
  );
  const row = Array.isArray(questionRows) ? questionRows[0] : undefined;
  if (!row) {
    throw new Error('Question insertion failed');
  }

  return {
    questionId: row.QuestionID,
    quizId: row.QuizID,
    questionType: row.QuestionType,
    questionText: row.QuestionText,
    points: row.Points,
    difficulty: row.Difficulty ?? null,
    tags: row.TagList ?? null
  };
};

export interface QuizDetail extends Quiz {
  questions: Array<
    Question & {
      options: Option[];
    }
  >;
}

export const getQuizWithQuestions = async (quizId: number): Promise<QuizDetail | null> => {
  const pool = getDbPool();
  const quiz = await getQuizById(quizId);
  if (!quiz) return null;

  const [questionRows] = await pool.query<QuestionRow[]>(
    `SELECT * FROM Questions WHERE QuizID = ? ORDER BY QuestionID`,
    [quizId]
  );
  const questions = Array.isArray(questionRows) ? questionRows : [];

  let optionRows: OptionRow[] = [];
  if (questions.length) {
    const questionIds = questions.map((q) => q.QuestionID);
    const [rows] = await pool.query<OptionRow[]>(
      `SELECT * FROM Options WHERE QuestionID IN (?) ORDER BY OptionID`,
      [questionIds]
    );
    optionRows = Array.isArray(rows) ? rows : [];
  }
  const optionsByQuestion = new Map<number, Option[]>();
  if (optionRows.length) {
    for (const row of optionRows) {
      const option: Option = {
        optionId: row.OptionID,
        questionId: row.QuestionID,
        optionText: row.OptionText,
        isCorrect: Boolean(row.IsCorrect),
        feedback: row.Feedback ?? null
      };
      const list = optionsByQuestion.get(option.questionId) ?? [];
      list.push(option);
      optionsByQuestion.set(option.questionId, list);
    }
  }

  const questionList = questions.map((row) => ({
    questionId: row.QuestionID,
    quizId: row.QuizID,
    questionType: row.QuestionType,
    questionText: row.QuestionText,
    points: row.Points,
    difficulty: row.Difficulty ?? null,
    tags: row.TagList ?? null,
    options: optionsByQuestion.get(row.QuestionID) ?? []
  }));

  return { ...quiz, questions: questionList };
};

const mapQuestionRow = (row: QuestionRow): Question => ({
  questionId: row.QuestionID,
  quizId: row.QuizID,
  questionType: row.QuestionType,
  questionText: row.QuestionText,
  points: row.Points,
  difficulty: row.Difficulty ?? null,
  tags: row.TagList ?? null
});

export const getQuestionById = async (
  questionId: number,
  conn?: PoolConnection
): Promise<Question | null> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [rows] = await executor.execute<QuestionRow[]>(
    `SELECT * FROM Questions WHERE QuestionID = ? LIMIT 1`,
    [questionId]
  );
  if (!conn) executor.release();
  const row = Array.isArray(rows) ? rows[0] : undefined;
  return row ? mapQuestionRow(row) : null;
};

export const deleteQuestionForQuiz = async (
  quizId: number,
  questionId: number,
  conn?: PoolConnection
): Promise<boolean> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [result] = await executor.execute<ResultSetHeader>(
    `DELETE FROM Questions WHERE QuestionID = ? AND QuizID = ?`,
    [questionId, quizId]
  );
  if (!conn) executor.release();
  return (result as ResultSetHeader).affectedRows > 0;
};

export const deleteQuizById = async (
  quizId: number,
  conn?: PoolConnection
): Promise<boolean> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [result] = await executor.execute<ResultSetHeader>(`DELETE FROM Quizzes WHERE QuizID = ?`, [quizId]);
  if (!conn) executor.release();
  return (result as ResultSetHeader).affectedRows > 0;
};

export const setQuizPublished = async (
  quizId: number,
  published: boolean,
  conn?: PoolConnection
): Promise<void> => {
  const executor = conn ?? (await getDbPool().getConnection());
  await executor.execute<ResultSetHeader>(`UPDATE Quizzes SET Published = ? WHERE QuizID = ?`, [published ? 1 : 0, quizId]);
  if (!conn) executor.release();
};
