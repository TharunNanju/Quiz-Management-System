import { getDbPool } from '../config/mysql.js';
const mapUser = (row) => ({
    userId: row.UserID,
    role: row.Role,
    name: row.Name,
    email: row.Email,
    passwordHash: row.PasswordHash,
    createdAt: row.CreatedAt,
    lastLogin: row.LastLogin ?? null
});
export const createUser = async (data, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [result] = await executor.execute(`INSERT INTO Users (Role, Name, Email, PasswordHash)
     VALUES (?, ?, ?, ?)`, [data.role, data.name, data.email, data.passwordHash]);
    const insertedId = result.insertId;
    if (!conn) {
        executor.release();
    }
    return (await findById(insertedId, conn));
};
export const findByEmail = async (email, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [rows] = await executor.execute(`SELECT * FROM Users WHERE Email = ? LIMIT 1`, [email]);
    if (!conn) {
        executor.release();
    }
    const row = Array.isArray(rows) ? rows[0] : undefined;
    return row ? mapUser(row) : null;
};
export const findById = async (userId, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    const [rows] = await executor.execute(`SELECT * FROM Users WHERE UserID = ? LIMIT 1`, [userId]);
    if (!conn) {
        executor.release();
    }
    const row = Array.isArray(rows) ? rows[0] : undefined;
    return row ? mapUser(row) : null;
};
export const updateLastLogin = async (userId, conn) => {
    const executor = conn ?? (await getDbPool().getConnection());
    await executor.execute(`UPDATE Users SET LastLogin = CURRENT_TIMESTAMP WHERE UserID = ?`, [userId]);
    if (!conn) {
        executor.release();
    }
};
