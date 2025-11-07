import { addQuestionWithOptions, createQuiz, getQuizWithQuestions, listQuizzes, setQuizPublished } from '../repositories/quiz.repository.js';
import { assignQuizToStudent } from '../repositories/assignment.repository.js';
import { getDbPool } from '../config/mysql.js';
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
export const assignQuiz = async (quizId, studentId, dueDate) => {
    return assignQuizToStudent(quizId, studentId, dueDate ?? null);
};
export const getQuizDetail = async (quizId) => {
    return getQuizWithQuestions(quizId);
};
export const getQuizAnalytics = async (quizId) => {
    const pool = getDbPool();
    const [[row]] = await pool.query(`SELECT 
        COUNT(*) AS attemptCount,
        SUM(CASE WHEN Status = 'submitted' OR Status = 'graded' THEN 1 ELSE 0 END) AS completedCount
      FROM Attempts WHERE QuizID = ?`, [quizId]);
    const attemptCount = Number(row?.attemptCount ?? 0);
    const completedCount = Number(row?.completedCount ?? 0);
    const [[averageRow]] = await pool.query(`SELECT GetQuizAverage(?) AS averageScore`, [quizId]);
    const averageScore = averageRow?.averageScore ? Number(averageRow.averageScore) : 0;
    const completionRate = attemptCount === 0 ? 0 : completedCount / attemptCount;
    return {
        averageScore,
        attemptCount,
        completionRate
    };
};
