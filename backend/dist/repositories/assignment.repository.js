import { getDbPool } from '../config/mysql.js';
export const assignQuizToStudent = async (quizId, studentId, dueDate) => {
    const pool = getDbPool();
    await pool.execute(`INSERT INTO QuizAssignments (QuizID, StudentID, DueDate, Status)
     VALUES (?, ?, ?, 'assigned')
     ON DUPLICATE KEY UPDATE DueDate = VALUES(DueDate), Status = 'assigned'`.replace(/\s+/g, ' '), [quizId, studentId, dueDate ?? null]);
    const [rows] = await pool.execute(`SELECT * FROM QuizAssignments WHERE QuizID = ? AND StudentID = ?`, [quizId, studentId]);
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row)
        throw new Error('Failed to assign quiz');
    return {
        assignmentId: row.AssignmentID,
        quizId: row.QuizID,
        studentId: row.StudentID,
        dueDate: row.DueDate ?? null,
        status: row.Status
    };
};
export const listAssignmentsForStudent = async (studentId) => {
    const pool = getDbPool();
    const [rows] = await pool.execute(`SELECT * FROM QuizAssignments WHERE StudentID = ?`, [studentId]);
    return Array.isArray(rows)
        ? rows.map((row) => ({
            assignmentId: row.AssignmentID,
            quizId: row.QuizID,
            studentId: row.StudentID,
            dueDate: row.DueDate ?? null,
            status: row.Status
        }))
        : [];
};
