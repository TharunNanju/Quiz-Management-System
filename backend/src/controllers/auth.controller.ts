import type { Request, Response } from 'express';

import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { issueTokensFromRefresh, loginUser, registerUser } from '../services/auth.service.js';
import env from '../config/env.js';

export const register = async (req: Request, res: Response) => {
  const payload = registerSchema.parse(req.body);
  const { user, tokens } = await registerUser(payload);

  res
    .cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    .status(201)
    .json({
      status: 'success',
      data: {
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken: tokens.accessToken
      }
    });
};

export const login = async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);
  const { user, tokens } = await loginUser(payload.email, payload.password);

  res
    .cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    .json({
      status: 'success',
      data: {
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken: tokens.accessToken
      }
    });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ status: 'error', message: 'Refresh token missing' });
  }

  const { user, tokens } = await issueTokensFromRefresh(refreshToken);

  res
    .cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    .json({
      status: 'success',
      data: {
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role
        },
        accessToken: tokens.accessToken
      }
    });
};
