import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { register } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore, type AuthState } from '../../store/auth';
import { getErrorMessage } from '../../utils/http';
import type { RegisterPayload } from '../../api/auth';

const roleOptions: RegisterPayload['role'][] = ['student', 'teacher'];

export const RegisterPage = () => {
  const [form, setForm] = useState<RegisterPayload>({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state: AuthState) => state.setAuth);
  const navigate = useNavigate();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev: RegisterPayload) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await register(form);
      setAuth(result);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to register'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/80 p-10 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Create your account</h1>
          <p className="mt-2 text-sm text-slate-400">Join the platform as a student or educator and start collaborating.</p>
        </div>
        <form className="grid grid-cols-1 gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input
            name="name"
            label="Full name"
            placeholder="Ada Lovelace"
            value={form.name}
            onChange={handleChange}
            required
          />
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Role</span>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map((role) => (
                <Button
                  key={role}
                  type="button"
                  variant={form.role === role ? 'primary' : 'ghost'}
                  className="border border-slate-700/60"
                  onClick={() => setForm((prev) => ({ ...prev, role }))}
                >
                  {role === 'student' ? 'Student' : 'Teacher'}
                </Button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Students can attempt assigned quizzes, while teachers can author content and view analytics. Admin accounts are managed by the platform.
            </p>
          </div>
          {error ? <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Register and continue'}
            </Button>
          </div>
        </form>
        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:text-brand/80">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
};
