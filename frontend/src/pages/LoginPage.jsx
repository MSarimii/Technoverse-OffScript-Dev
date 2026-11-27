import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleHome } from '../context/AuthContext';
import { USE_MOCK } from '../services/api';
import { toast } from 'sonner';
import { Lock, Mail, ArrowRight } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Candidate', name: 'Zainab Khan', email: 'candidate@sems.edu', role: 'candidate' },
  { label: 'Examiner', name: 'Prof. Ayesha Siddiqui', email: 'examiner@sems.edu', role: 'examiner' },
  { label: 'Admin', name: 'Dr. Tariq Mahmood', email: 'admin@sems.edu', role: 'admin' },
];

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Signed in as ${user.name}`);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const user = await login(demoEmail, 'demo1234');
      toast.success(`Signed in as ${user.name} (${user.role})`);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Demo sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-14">
      <div className="bg-surface border border-line rounded-lg p-6 sm:p-8 shadow-sm">
        <h1 className="font-serif text-3xl text-ink mb-1">Sign in to SEMS</h1>
        <p className="text-sm text-ink-muted mb-6">
          Accounts are provisioned by your institution administrator.
        </p>

        {errorMsg && (
          <div role="alert" className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-status-danger">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-ink mb-1.5">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@sems.edu"
                className="w-full pl-9 pr-3 py-2 text-sm bg-canvas border border-line rounded-md text-ink focus:outline-none focus:ring-2 focus:ring-navy-800"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-ink mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-canvas border border-line rounded-md text-ink focus:outline-none focus:ring-2 focus:ring-navy-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-md text-sm transition-transform active:scale-[0.98]"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {USE_MOCK && (
          <div className="mt-6 pt-5 border-t border-line">
            <p className="text-xs font-mono text-ink-muted mb-3">
              Quick Demo Access (Mock Mode)
            </p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin(acc.email)}
                  className="flex items-center justify-between px-3 py-2 rounded-md border border-line bg-canvas hover:bg-subtle text-left transition-colors active:scale-[0.99]"
                >
                  <div>
                    <span className="text-xs font-semibold text-ink block">{acc.name}</span>
                    <span className="text-[11px] font-mono text-ink-muted">{acc.email}</span>
                  </div>
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-navy-50 text-navy-900">
                    {acc.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
