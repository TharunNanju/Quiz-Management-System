import { getDbPool } from '../config/mysql.js';
const mapQuiz = (row) => ({
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
export const createQuiz = async (data, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [result] = await executor.execute(`INSERT INTO Quizzes (CreatorID, Title, Description, Category, TimeLimit, StartTime, EndTime, Published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        .replace(/\s+/g, ' '), [
        data.creatorId,
        data.title,
        data.description,
        data.category,
        data.timeLimit,
        data.startTime,
        data.endTime,
        data.published ?? false
    ]);
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
export const listQuizzes = async (filters = {}) => {
    const pool = getDbPool();
    let query = `SELECT DISTINCT q.* FROM Quizzes q`;
    const conditions = [];
    const params = [];
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
    const [rows] = await pool.query(query, params);
    return Array.isArray(rows) ? rows.map(mapQuiz) : [];
};
export const getQuizById = async (quizId, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [rows] = await executor.execute(`SELECT * FROM Quizzes WHERE QuizID = ? LIMIT 1`, [quizId]);
    if (!conn) {
        executor.release();
    }
    const row = Array.isArray(rows) ? rows[0] : undefined;
    return row ? mapQuiz(row) : null;
};
export const addQuestionWithOptions = async (input, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [result] = await executor.execute(`INSERT INTO Questions (QuizID, QuestionType, QuestionText, Points, Difficulty, TagList)
     VALUES (?, ?, ?, ?, ?, ?)`.replace(/\s+/g, ' '), [
        input.quizId,
        input.questionType,
        input.questionText,
        input.points,
        input.difficulty ?? null,
        input.tags ?? null
    ]);
    const questionId = result.insertId;
    if (input.options?.length) {
        const values = input.options.map((option) => [
            questionId,
            option.optionText,
            option.isCorrect ? 1 : 0,
            option.feedback ?? null
        ]);
        await executor.query(`INSERT INTO Options (QuestionID, OptionText, IsCorrect, Feedback) VALUES ?`, [values]);
    }
    if (!conn) {
        executor.release();
    }
    const [questionRows] = await getDbPool().execute(`SELECT * FROM Questions WHERE QuestionID = ?`, [
        questionId
    ]);
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
export const getQuizWithQuestions = async (quizId) => {
    const pool = getDbPool();
    const quiz = await getQuizById(quizId);
    if (!quiz)
        return null;
    const [questionRows] = await pool.query(`SELECT * FROM Questions WHERE QuizID = ? ORDER BY QuestionID`, [
        quizId
    ]);
    const questions = Array.isArray(questionRows) ? questionRows : [];
    const [optionRows] = await pool.query(`SELECT * FROM Options WHERE QuestionID IN (?) ORDER BY OptionID`, [questions.map((q) => q.QuestionID)]);
    const optionsByQuestion = new Map();
    if (Array.isArray(optionRows)) {
        for (const row of optionRows) {
            const option = {
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
export const setQuizPublished = async (quizId, published, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    await executor.execute(`UPDATE Quizzes SET Published = ? WHERE QuizID = ?`, [published ? 1 : 0, quizId]);
    if (!conn)
        executor.release();
};
