import type { PoolConnection } from 'mysql2/promise';

import { getDbPool } from '../config/mysql.js';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  userId: number;
  role: UserRole;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin: Date | null;
}

const mapUser = (row: any): User => ({
  userId: row.UserID,
  role: row.Role,
  name: row.Name,
  email: row.Email,
  passwordHash: row.PasswordHash,
  createdAt: row.CreatedAt,
  lastLogin: row.LastLogin ?? null
});

export const createUser = async (
  data: Pick<User, 'name' | 'email' | 'passwordHash' | 'role'>,
  conn?: PoolConnection
): Promise<User> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [result] = await executor.execute(
    `INSERT INTO Users (Role, Name, Email, PasswordHash)
     VALUES (?, ?, ?, ?)`,
    [data.role, data.name, data.email, data.passwordHash]
  );

  const insertedId = (result as any).insertId as number;
  if (!conn) {
    executor.release();
  }
  return (await findById(insertedId, conn)) as User;
};

export const findByEmail = async (email: string, conn?: PoolConnection): Promise<User | null> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [rows] = await executor.execute(`SELECT * FROM Users WHERE Email = ? LIMIT 1`, [email]);

  if (!conn) {
    executor.release();
  }

  const row = Array.isArray(rows) ? rows[0] : undefined;
  return row ? mapUser(row) : null;
};

export const findById = async (userId: number, conn?: PoolConnection): Promise<User | null> => {
  const executor = conn ?? (await getDbPool().getConnection());
  const [rows] = await executor.execute(`SELECT * FROM Users WHERE UserID = ? LIMIT 1`, [userId]);

  if (!conn) {
    executor.release();
  }

  const row = Array.isArray(rows) ? rows[0] : undefined;
  return row ? mapUser(row) : null;
};

export const updateLastLogin = async (userId: number, conn?: PoolConnection) => {
  const executor = conn ?? (await getDbPool().getConnection());
  await executor.execute(`UPDATE Users SET LastLogin = CURRENT_TIMESTAMP WHERE UserID = ?`, [userId]);
  if (!conn) {
    executor.release();
  }
};
