import { api, type ApiResponse, requestSessionRefresh } from './client';
import type { AuthResult, AuthUser } from '../types/auth';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
  role: Extract<AuthUser['role'], 'student' | 'teacher'>;
}

export const login = async (payload: LoginPayload): Promise<AuthResult> => {
  const response = await api.post<ApiResponse<AuthResult>>('/auth/login', payload);
  return response.data.data;
};

export const register = async (payload: RegisterPayload): Promise<AuthResult> => {
  const response = await api.post<ApiResponse<AuthResult>>('/auth/register', payload);
  return response.data.data;
};

export const refreshSession = async (): Promise<AuthResult | null> => {
  return requestSessionRefresh();
};
