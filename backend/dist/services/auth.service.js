import bcrypt from 'bcryptjs';
import { createUser, findByEmail, findById, updateLastLogin } from '../repositories/user.repository.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken as verifyRefreshTokenJwt } from '../utils/jwt.js';
const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
export const registerUser = async (payload, conn) => {
    const existing = await findByEmail(payload.email, conn);
    if (existing) {
        throw createHttpError('Email already registered', 409);
    }
    // eslint-disable-next-line import/no-named-as-default-member
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
        throw createHttpError('Invalid credentials', 401);
    }
    // eslint-disable-next-line import/no-named-as-default-member
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        throw createHttpError('Invalid credentials', 401);
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
    catch {
        throw createHttpError('Invalid refresh token', 401);
    }
};
export const issueTokensFromRefresh = async (token) => {
    const payload = verifyRefreshToken(token);
    const user = await findById(payload.userId);
    if (!user) {
        throw createHttpError('User not found', 404);
    }
    const tokens = issueTokens(user.userId, user.role);
    return { user, tokens };
};
