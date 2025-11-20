import { getDbPool } from '../config/mysql.js';
import { assignQuizToStudent } from '../repositories/assignment.repository.js';
import { addQuestionWithOptions, createQuiz, deleteQuestionForQuiz, deleteQuizById, getQuestionById, getQuizById, getQuizWithQuestions, listQuizzes, setQuizPublished } from '../repositories/quiz.repository.js';
import { findByEmail as findUserByEmail, findById as findUserById } from '../repositories/user.repository.js';
export const createQuizForTeacher = async (creatorId, payload, conn) => {
    const quiz = await createQuiz({
        creatorId,
        title: payload.title,
        description: payload.description ?? null,
        category: payload.category ?? null,
        timeLimit: payload.timeLimit,
        startTime: payload.startTime ?? null,
        endTime: payload.endTime ?? null,
        published: payload.published ?? false
    }, conn);
    return quiz;
};
export const listQuizzesForUser = async (params) => {
    if (params.role === 'teacher') {
        return listQuizzes({ creatorId: params.userId, category: params.category });
    }
    if (params.role === 'admin') {
        return listQuizzes({ category: params.category });
    }
    return listQuizzes({ assignedStudentId: params.userId, category: params.category, published: true });
};
export const addQuestionToQuiz = async (payload, conn) => {
    return addQuestionWithOptions(payload, conn);
};
export const publishQuiz = async (quizId, published, conn) => {
    await setQuizPublished(quizId, published, conn);
};
export const assignQuiz = async (quizId, target, dueDate) => {
    let student = null;
    if (target.studentId !== undefined) {
        student = await findUserById(target.studentId);
    }
    else if (target.studentEmail) {
        student = await findUserByEmail(target.studentEmail);
    }
    if (!student) {
        throw buildHttpError('Student not found', 404);
    }
    if (student.role !== 'student') {
        throw buildHttpError('Only student accounts can receive assignments', 400);
    }
    return assignQuizToStudent(quizId, student.userId, dueDate ?? null);
};
export const getQuizDetail = async (quizId) => {
    return getQuizWithQuestions(quizId);
};
const buildHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
const assertCanManageQuiz = (quiz, actor) => {
    if (actor.role === 'admin')
        return;
    if (actor.role === 'teacher' && quiz.creatorId === actor.id)
        return;
    throw buildHttpError('Forbidden', 403);
};
export const getQuizAnalytics = async (quizId) => {
    const pool = getDbPool();
    const [aggregateRows] = await pool.query(`SELECT 
        COUNT(*) AS attemptCount,
        SUM(CASE WHEN Status = 'submitted' OR Status = 'graded' THEN 1 ELSE 0 END) AS completedCount
      FROM Attempts WHERE QuizID = ?`, [quizId]);
    const aggregate = aggregateRows[0];
    const attemptCount = Number(aggregate?.attemptCount ?? 0);
    const completedCount = Number(aggregate?.completedCount ?? 0);
    const [averageRows] = await pool.query(`SELECT IFNULL(AVG(Score), 0) AS averageScore FROM Attempts WHERE QuizID = ? AND Score IS NOT NULL`, [quizId]);
    const averageScore = Number(averageRows[0]?.averageScore ?? 0);
    const completionRate = attemptCount === 0 ? 0 : completedCount / attemptCount;
    return {
        averageScore,
        attemptCount,
        completionRate
    };
};
export const listQuizAttempts = async (quizId, actor) => {
    const quiz = await getQuizById(quizId);
    if (!quiz) {
        throw buildHttpError('Quiz not found', 404);
    }
    assertCanManageQuiz(quiz, actor);
    const pool = getDbPool();
    const [rows] = await pool.query(`SELECT 
        a.AttemptID,
        a.StudentID,
        u.Name AS StudentName,
        u.Email AS StudentEmail,
        a.StartTime,
        a.EndTime,
        a.Status,
        a.Score
      FROM Attempts a
      JOIN Users u ON u.UserID = a.StudentID
      WHERE a.QuizID = ?
      ORDER BY a.StartTime DESC`, [quizId]);
    return rows.map((row) => ({
        attemptId: row.AttemptID,
        studentId: row.StudentID,
        studentName: row.StudentName,
        studentEmail: row.StudentEmail,
        startTime: row.StartTime,
        endTime: row.EndTime ?? null,
        status: row.Status ?? 'in_progress',
        score: row.Score === null ? null : Number(row.Score)
    }));
};
export const deleteQuizForUser = async (quizId, actor) => {
    const quiz = await getQuizById(quizId);
    if (!quiz) {
        throw buildHttpError('Quiz not found', 404);
    }
    assertCanManageQuiz(quiz, actor);
    await deleteQuizById(quizId);
};
export const deleteQuestionFromQuiz = async (quizId, questionId, actor) => {
    const quiz = await getQuizById(quizId);
    if (!quiz) {
        throw buildHttpError('Quiz not found', 404);
    }
    assertCanManageQuiz(quiz, actor);
    const question = await getQuestionById(questionId);
    if (!question || question.quizId !== quizId) {
        throw buildHttpError('Question not found', 404);
    }
    await deleteQuestionForQuiz(quizId, questionId);
};
