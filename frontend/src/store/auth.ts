import { create } from 'zustand';
import { configureAuthBindings } from '../api/client';
import type { AuthResult } from '../types/auth';

export interface AuthState {
  user: AuthResult['user'] | null;
  accessToken: string | null;
  bootstrapCompleted: boolean;
  setAuth: (payload: AuthResult) => void;
  clearAuth: () => void;
  markBootstrapped: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  bootstrapCompleted: false,
  setAuth: (payload: AuthResult) => set({ user: payload.user, accessToken: payload.accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  markBootstrapped: () => set({ bootstrapCompleted: true })
}));

configureAuthBindings({
  getAccessToken: () => useAuthStore.getState().accessToken,
  applyTokens: (user, accessToken) => {
    useAuthStore.setState({ user, accessToken });
  },
  clearAuth: () => {
    useAuthStore.setState({ user: null, accessToken: null });
  }
});

export const selectAuthUser = () => useAuthStore.getState().user;