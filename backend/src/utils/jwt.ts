import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';

import env from '../config/env.js';

interface TokenPayload {
  sub: number;
  role: string;
}

const signToken = (
  payload: TokenPayload,
  secret: Secret,
  expiresIn: SignOptions['expiresIn']
) => jwt.sign(payload, secret, { expiresIn });

const decodeToken = (token: string, secret: Secret): TokenPayload => {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  const payload = decoded as JwtPayload;
  const subject =
    typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub;
  if (typeof subject !== 'number' || Number.isNaN(subject) || typeof payload.role !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub: subject, role: payload.role };
};

export const generateAccessToken = (payload: TokenPayload) =>
  signToken(payload, env.JWT_SECRET, env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']);

export const generateRefreshToken = (payload: TokenPayload) =>
  signToken(payload, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']);

export const verifyAccessToken = (token: string): TokenPayload => {
  return decodeToken(token, env.JWT_SECRET);
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return decodeToken(token, env.JWT_REFRESH_SECRET);
};
