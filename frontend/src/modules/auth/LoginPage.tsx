import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { login } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore, type AuthState } from '../../store/auth';
import { getErrorMessage } from '../../utils/http';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state: AuthState) => state.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login({ email, password });
      setAuth(result);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to continue shaping smarter assessments.</p>
        </div>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            required
          />
          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            required
          />
          {error ? <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}
          <Button type="submit" disabled={loading} variant="primary" size="lg">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-8 text-center text-sm text-slate-400">
          Need an account?{' '}
          <Link to="/register" className="font-semibold text-brand hover:text-brand/80">
            Register as student or teacher
          </Link>
        </p>
      </div>
    </div>
  );
};
