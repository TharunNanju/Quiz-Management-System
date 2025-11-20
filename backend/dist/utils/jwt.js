import jwt from 'jsonwebtoken';
import env from '../config/env.js';
const signToken = (payload, secret, expiresIn) => jwt.sign(payload, secret, { expiresIn });
const decodeToken = (token, secret) => {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string') {
        throw new Error('Invalid token payload');
    }
    const payload = decoded;
    const subject = typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub;
    if (typeof subject !== 'number' || Number.isNaN(subject) || typeof payload.role !== 'string') {
        throw new Error('Invalid token payload');
    }
    return { sub: subject, role: payload.role };
};
export const generateAccessToken = (payload) => signToken(payload, env.JWT_SECRET, env.JWT_ACCESS_EXPIRES_IN);
export const generateRefreshToken = (payload) => signToken(payload, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);
export const verifyAccessToken = (token) => {
    return decodeToken(token, env.JWT_SECRET);
};
export const verifyRefreshToken = (token) => {
    return decodeToken(token, env.JWT_REFRESH_SECRET);
};
