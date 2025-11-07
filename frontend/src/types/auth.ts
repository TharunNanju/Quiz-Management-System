export type UserRole = 'student' | 'teacher' | 'admin';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
}
