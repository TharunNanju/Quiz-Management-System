import { useEffect, useState, type ReactNode } from 'react';

import { refreshSession } from '../../api/auth';
import { SplashScreen } from '../../components/SplashScreen';
import { useAuthStore } from '../../store/auth';
import type { AuthResult } from '../../types/auth';

export interface AuthBootstrapProps {
  children: ReactNode;
}

export const AuthBootstrap = ({ children }: AuthBootstrapProps) => {
  const { user, bootstrapCompleted, setAuth, clearAuth, markBootstrapped } = useAuthStore();
  const [loading, setLoading] = useState(!bootstrapCompleted && !user);

  useEffect(() => {
    if (bootstrapCompleted) {
      setLoading(false);
      return;
    }

    let active = true;

    const bootstrap = async () => {
      if (user) {
        markBootstrapped();
        setLoading(false);
        return;
      }

      try {
        const result = await refreshSession();
        if (!active) return;
        if (result) {
          setAuth(result as AuthResult);
        } else {
          clearAuth();
        }
      } catch (error) {
        if (active) {
          clearAuth();
        }
      } finally {
        if (active) {
          markBootstrapped();
          setLoading(false);
        }
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, [user, bootstrapCompleted, setAuth, clearAuth, markBootstrapped]);

  if (!bootstrapCompleted || loading) {
    return <SplashScreen message="Loading session…" />;
  }

  return <>{children}</>;
};
