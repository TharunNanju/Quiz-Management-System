import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { getDbPool } from '../config/mysql.js';

interface QuizAssignmentRow extends RowDataPacket {
  AssignmentID: number;
  QuizID: number;
  StudentID: number;
  DueDate: Date | null;
  Status: 'assigned' | 'completed' | 'overdue';
}

export interface QuizAssignment {
  assignmentId: number;
  quizId: number;
  studentId: number;
  dueDate: Date | null;
  status: 'assigned' | 'completed' | 'overdue';
}

export const assignQuizToStudent = async (
  quizId: number,
  studentId: number,
  dueDate?: Date | null
): Promise<QuizAssignment> => {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    `INSERT INTO QuizAssignments (QuizID, StudentID, DueDate, Status)
     VALUES (?, ?, ?, 'assigned')
     ON DUPLICATE KEY UPDATE DueDate = VALUES(DueDate), Status = 'assigned'`.replace(/\s+/g, ' '),
    [quizId, studentId, dueDate ?? null]
  );

  const [rows] = await pool.execute<QuizAssignmentRow[]>(
    `SELECT * FROM QuizAssignments WHERE QuizID = ? AND StudentID = ?`,
    [quizId, studentId]
  );
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) throw new Error('Failed to assign quiz');
  return {
    assignmentId: row.AssignmentID,
    quizId: row.QuizID,
    studentId: row.StudentID,
    dueDate: row.DueDate ?? null,
    status: row.Status
  };
};

export const listAssignmentsForStudent = async (studentId: number): Promise<QuizAssignment[]> => {
  const pool = getDbPool();
  const [rows] = await pool.execute<QuizAssignmentRow[]>(
    `SELECT * FROM QuizAssignments WHERE StudentID = ?`,
    [studentId]
  );
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
