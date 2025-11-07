import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import { Button } from '../../components/ui/Button';
import { useAuthStore, type AuthState } from '../../store/auth';

const navItems = [{ label: 'Dashboard', to: '/' }];

export const Layout = () => {
  const { user, clearAuth } = useAuthStore((state: AuthState) => ({
    user: state.user,
    clearAuth: state.clearAuth
  }));
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="grid min-h-screen grid-rows-[auto,1fr] bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/60 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20 text-lg font-semibold text-brand">Q</span>
              <div>
                <p className="text-sm font-semibold text-white">Quiz Management System</p>
                <p className="text-xs text-slate-400">Empower teaching, elevate outcomes</p>
              </div>
            </div>
            <nav className="hidden items-center gap-3 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    clsx(
                      'rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-800/80',
                      isActive ? 'text-white bg-slate-800/80' : 'text-slate-300'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">{user?.role}</p>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};
