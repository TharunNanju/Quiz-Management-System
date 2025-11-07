import { getDbPool } from '../config/mysql.js';
export const getConnection = async () => {
    const pool = getDbPool();
    return pool.getConnection();
};
export const withTransaction = async (handler) => {
    const connection = await getConnection();
    try {
        await connection.beginTransaction();
        const result = await handler(connection);
        await connection.commit();
        return result;
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
};
