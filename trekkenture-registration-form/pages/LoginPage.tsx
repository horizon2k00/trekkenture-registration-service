import { FormEvent, useState } from 'react';
import { Mountain } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/admin/forms" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      const destination = (location.state as { from?: string } | null)?.from;
      navigate(destination || '/admin/forms', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Mountain className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="text-center text-2xl font-bold text-slate-900">Admin login</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-500">
          Manage forms and registration responses.
        </p>
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <label className="mb-4 block text-sm font-semibold text-slate-700">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="mb-6 block text-sm font-semibold text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <button disabled={loading} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-white disabled:opacity-60">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
