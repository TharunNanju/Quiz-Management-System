import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { SplashScreen } from '../../components/SplashScreen';
import { useAuthStore, type AuthState } from '../../store/auth';

export const ProtectedRoute = () => {
  const { user, bootstrapCompleted } = useAuthStore((state: AuthState) => ({
    user: state.user,
    bootstrapCompleted: state.bootstrapCompleted
  }));
  const location = useLocation();

  if (!bootstrapCompleted) {
    return <SplashScreen message="Restoring secure session…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
