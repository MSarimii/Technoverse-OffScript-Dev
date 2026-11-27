import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { getRoleHome } from '../context/AuthContext';
import { USE_MOCK } from '../services/api';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Button, Input } from '../components/ui';

const loginSchema = z.object({
  email: z.string().email('Enter a valid institutional email address.'),
  password: z.string().min(4, 'Password must be at least 4 characters.'),
});

const DEMO_ACCOUNTS = [
  { label: 'Candidate', name: 'Candidate One', email: 'candidate1@sems.edu' },
  { label: 'Examiner', name: 'Examiner One', email: 'examiner1@sems.edu' },
  { label: 'Admin', name: 'SEMS Administrator', email: 'admin@sems.edu' },
];

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const isExpired =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('expired') === '1';
  const [serverError, setServerError] = useState(
    isExpired ? 'Your session expired. Please sign in again.' : ''
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

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
      const user = await login(demoEmail, 'Pass1234!');
      toast.success(`Signed in as ${user.name} (${user.role})`);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      setServerError(err.message || 'Demo sign in failed.');
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
      <div className="grid grid-cols-1 md:grid-cols-12 bg-surface border border-line rounded-2xl overflow-hidden shadow-[var(--card-shadow)]">
        {/* Brand Panel */}
        <section className="md:col-span-5 bg-[#0B0F0E] text-white p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#181F1D] relative overflow-hidden">
          <div className="relative space-y-4">
            <p className="eyebrow-rule font-mono text-[11px] uppercase tracking-[0.12em] text-[#10B981]">
              Institutional Access
            </p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] text-white leading-[1.1]">
              Server-authoritative assessments, built for <span className="text-[#10B981]">trust</span>.
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
              Role-scoped access for Administrators, Examiners, and Candidates with offline-resilient answer queues.
            </p>
          </div>

          <div className="relative mt-10 pt-5 border-t border-[#181F1D] space-y-2 font-mono text-xs text-white/70">
            <div className="flex justify-between"><span className="text-[#10B981]">01</span><span>Server clock authority</span></div>
            <div className="flex justify-between"><span className="text-[#10B981]">02</span><span>Outage-resilient queue</span></div>
            <div className="flex justify-between"><span className="text-[#10B981]">03</span><span>Balanced paper fairness</span></div>
          </div>
        </section>

        {/* Form Panel */}
        <section className="md:col-span-7 p-8 sm:p-10">
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] text-ink mb-1">Sign in to SEMS</h2>
          <p className="text-xs text-ink-muted mb-6">
            Accounts are provisioned by your institution administrator.
          </p>

          {serverError && (
            <div role="alert" className="mb-4 p-3 rounded-[10px] bg-red-500/10 border border-status-danger/40 text-xs text-status-danger">
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

            <Button type="submit" loading={isSubmitting} className="w-full rounded-full">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </form>

          {import.meta.env.DEV && USE_MOCK && (
            <div className="mt-7 pt-5 border-t border-line">
              <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                Demo Credentials (Dev Mock Mode)
              </p>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDemoLogin(acc.email)}
                    className="min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-[10px] border border-line bg-canvas hover:border-champagne/60 text-left transition-colors active:scale-[0.98]"
                  >
                    <div>
                      <span className="text-xs font-medium text-ink block">{acc.name}</span>
                      <span className="text-[11px] font-mono text-ink-muted">{acc.email}</span>
                    </div>
                    <span className="text-[11px] font-mono uppercase text-champagne">
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
