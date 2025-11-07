import { getDbPool } from '../config/mysql.js';
const mapAttempt = (row) => ({
    attemptId: row.AttemptID,
    studentId: row.StudentID,
    quizId: row.QuizID,
    startTime: row.StartTime,
    endTime: row.EndTime ?? null,
    score: row.Score ?? null,
    status: row.Status ?? 'in_progress'
});
export const createAttempt = async (studentId, quizId, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [result] = await executor.execute(`INSERT INTO Attempts (StudentID, QuizID, Status) VALUES (?, ?, 'in_progress')`, [studentId, quizId]);
    if (!conn)
        executor.release();
    const attemptId = result.insertId;
    const attempt = await getAttemptById(attemptId);
    if (!attempt)
        throw new Error('Failed to create attempt');
    return attempt;
};
export const getAttemptById = async (attemptId, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [rows] = await executor.execute(`SELECT * FROM Attempts WHERE AttemptID = ?`, [attemptId]);
    if (!conn)
        executor.release();
    const row = Array.isArray(rows) ? rows[0] : undefined;
    return row ? mapAttempt(row) : null;
};
export const recordResponse = async (attemptId, questionId, payload, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [result] = await executor.execute(`INSERT INTO Responses (AttemptID, QuestionID, SelectedOptionID, ResponseText)
     VALUES (?, ?, ?, ?)`.replace(/\s+/g, ' '), [attemptId, questionId, payload.selectedOptionId ?? null, payload.responseText ?? null]);
    if (!conn)
        executor.release();
    const responseId = result.insertId;
    const response = await getResponseById(responseId);
    if (!response)
        throw new Error('Failed to record response');
    return response;
};
export const getResponseById = async (responseId, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [rows] = await executor.execute(`SELECT * FROM Responses WHERE ResponseID = ?`, [responseId]);
    if (!conn)
        executor.release();
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row)
        return null;
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
export const listResponsesForAttempt = async (attemptId) => {
    const pool = getDbPool();
    const [rows] = await pool.execute(`SELECT * FROM Responses WHERE AttemptID = ?`, [attemptId]);
    if (!Array.isArray(rows))
        return [];
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
export const submitAttempt = async (attemptId, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    await executor.query(`CALL CalculateAttemptScore(?)`, [attemptId]);
    await executor.execute(`UPDATE Attempts SET Status = 'submitted' WHERE AttemptID = ?`, [attemptId]);
    if (!conn)
        executor.release();
    const attempt = await getAttemptById(attemptId);
    if (!attempt)
        throw new Error('Attempt not found after submission');
    return attempt;
};
export const listAttemptsForQuiz = async (quizId) => {
    const pool = getDbPool();
    const [rows] = await pool.execute(`SELECT * FROM Attempts WHERE QuizID = ? ORDER BY StartTime DESC`, [
        quizId
    ]);
    return Array.isArray(rows) ? rows.map(mapAttempt) : [];
};
