import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { getRoleHome } from '../context/AuthContext';
import { USE_MOCK } from '../services/api';
import { toast } from 'sonner';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Input } from '../components/ui';

const loginSchema = z.object({
  email: z.string().email('Enter a valid institutional email address.'),
  password: z.string().min(4, 'Password must be at least 4 characters.'),
});

const DEMO_ACCOUNTS = [
  { label: 'Candidate', name: 'Zainab Khan', email: 'candidate@sems.edu', role: 'candidate' },
  { label: 'Examiner', name: 'Prof. Ayesha Siddiqui', email: 'examiner@sems.edu', role: 'examiner' },
  { label: 'Admin', name: 'Dr. Tariq Mahmood', email: 'admin@sems.edu', role: 'admin' },
];

const ASCII_FRAMES = [
  '┌──────────────────────┐\n│ SEMS // SEALED KEY   │\n│ [####........] SYNC  │\n└──────────────────────┘',
  '┌──────────────────────┐\n│ SEMS // SEALED KEY   │\n│ [########....] SYNC  │\n└──────────────────────┘',
  '┌──────────────────────┐\n│ SEMS // SEALED KEY   │\n│ [############] LOCK  │\n└──────────────────────┘',
];

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const isExpired = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('expired') === '1';
  const [serverError, setServerError] = useState(
    isExpired ? 'Your session expired. Please sign in again.' : ''
  );
  const [frame, setFrame] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setFrame(2);
      return;
    }
    const id = setInterval(() => setFrame((f) => (f + 1) % ASCII_FRAMES.length), 1400);
    return () => clearInterval(id);
  }, []);

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const user = await login(values.email.trim(), values.password);
      toast.success(`Signed in as ${user.name}`);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      setServerError(err.message || 'Sign in failed.');
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    setServerError('');
    try {
      const user = await login(demoEmail, 'demo1234');
      toast.success(`Signed in as ${user.name} (${user.role})`);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      setServerError(err.message || 'Demo sign in failed.');
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
      <div className="grid grid-cols-1 md:grid-cols-2 bg-surface border border-line rounded-xl overflow-hidden">
        {/* Brand Panel */}
        <section className="bg-subtle p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-line">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-cobalt uppercase mb-3">
              <ShieldCheck className="w-4 h-4" /> Calm Examination Hall
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight mb-3">
              Server-authoritative assessments, built for trust.
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              Role-scoped access for Administrators, Examiners, and Candidates with offline-resilient answer queues.
            </p>
          </div>

          <pre
            aria-hidden="true"
            className="mt-8 p-3 rounded-lg bg-surface border border-line font-mono text-[11px] leading-snug text-ink-muted overflow-x-auto"
          >
            {ASCII_FRAMES[frame]}
          </pre>
        </section>

        {/* Form Panel */}
        <section className="p-6 sm:p-8">
          <h2 className="font-serif text-2xl text-ink mb-1">Sign in to SEMS</h2>
          <p className="text-xs text-ink-muted mb-5">
            Accounts are provisioned by your institution administrator.
          </p>

          {serverError && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-status-danger">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Institutional Email"
              type="email"
              placeholder="name@sems.edu"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" loading={isSubmitting} className="w-full">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {import.meta.env.DEV && USE_MOCK && (
            <div className="mt-6 pt-5 border-t border-line">
              <p className="text-xs font-mono text-ink-muted mb-2.5">
                Demo Credentials (Dev Mock Mode)
              </p>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDemoLogin(acc.email)}
                    className="min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg border border-line bg-canvas hover:bg-subtle text-left transition-colors active:scale-[0.98]"
                  >
                    <div>
                      <span className="text-xs font-semibold text-ink block">{acc.name}</span>
                      <span className="text-[11px] font-mono text-ink-muted">{acc.email}</span>
                    </div>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-navy-50 text-cobalt">
                      {acc.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
