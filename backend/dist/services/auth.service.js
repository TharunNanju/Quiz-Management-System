import bcrypt from 'bcryptjs';
import { createUser, findByEmail, updateLastLogin } from '../repositories/user.repository.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken as verifyRefreshTokenJwt } from '../utils/jwt.js';
import { findById } from '../repositories/user.repository.js';
export const registerUser = async (payload, conn) => {
    const existing = await findByEmail(payload.email, conn);
    if (existing) {
        const error = new Error('Email already registered');
        error.statusCode = 409;
        throw error;
    }
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await createUser({
        name: payload.name,
        email: payload.email,
        passwordHash,
        role: payload.role
    }, conn);
    const tokens = issueTokens(user.userId, user.role);
    return { user, tokens };
};
export const loginUser = async (email, password, conn) => {
    const user = await findByEmail(email, conn);
    if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
    }
    await updateLastLogin(user.userId, conn);
    const tokens = issueTokens(user.userId, user.role);
    return { user, tokens };
};
const issueTokens = (userId, role) => {
    const payload = { sub: userId, role };
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
    };
};
export const verifyRefreshToken = (token) => {
    try {
        const payload = verifyRefreshTokenJwt(token);
        return {
            userId: payload.sub,
            role: payload.role
        };
    }
    catch (error) {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        throw err;
    }
};
export const issueTokensFromRefresh = async (token) => {
    const payload = verifyRefreshToken(token);
    const user = await findById(payload.userId);
    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }
    const tokens = issueTokens(user.userId, user.role);
    return { user, tokens };
};
