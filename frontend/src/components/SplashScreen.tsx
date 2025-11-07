import type { ReactNode } from 'react';

export interface SplashScreenProps {
  message?: ReactNode;
}

export const SplashScreen = ({ message = 'Preparing your workspace…' }: SplashScreenProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-brand" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
};
