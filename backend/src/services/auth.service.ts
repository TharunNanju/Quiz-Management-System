import bcrypt from 'bcryptjs';

import env from '../config/env.js';
import { createUser, findByEmail, updateLastLogin, type UserRole } from '../repositories/user.repository.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken as verifyRefreshTokenJwt
} from '../utils/jwt.js';
import { findById } from '../repositories/user.repository.js';
import type { PoolConnection } from 'mysql2/promise';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const registerUser = async (
  payload: AuthPayload,
  conn?: PoolConnection
) => {
  const existing = await findByEmail(payload.email, conn);
  if (existing) {
    const error = new Error('Email already registered');
    (error as any).statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await createUser(
    {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role
    },
    conn
  );

  const tokens = issueTokens(user.userId, user.role);
  return { user, tokens };
};

export const loginUser = async (
  email: string,
  password: string,
  conn?: PoolConnection
) => {
  const user = await findByEmail(email, conn);
  if (!user) {
    const error = new Error('Invalid credentials');
    (error as any).statusCode = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const error = new Error('Invalid credentials');
    (error as any).statusCode = 401;
    throw error;
  }

  await updateLastLogin(user.userId, conn);
  const tokens = issueTokens(user.userId, user.role);
  return { user, tokens };
};

const issueTokens = (userId: number, role: UserRole): AuthTokens => {
  const payload = { sub: userId, role };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

export const verifyRefreshToken = (token: string) => {
  try {
    const payload = verifyRefreshTokenJwt(token);
    return {
      userId: payload.sub,
      role: payload.role
    };
  } catch (error) {
    const err = new Error('Invalid refresh token');
    (err as any).statusCode = 401;
    throw err;
  }
};

export const issueTokensFromRefresh = async (token: string) => {
  const payload = verifyRefreshToken(token);
  const user = await findById(payload.userId);
  if (!user) {
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }
  const tokens = issueTokens(user.userId, user.role);
  return { user, tokens };
};
