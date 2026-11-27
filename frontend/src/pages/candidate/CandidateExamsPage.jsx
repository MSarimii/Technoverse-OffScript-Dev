import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { useTheme } from '../../context/ThemeContext';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Tabs, Select, Switch, Dialog, Skeleton, EmptyState, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import { Clock, Play, RotateCcw, CheckCircle, Calendar, Lock, SlidersHorizontal } from 'lucide-react';

function formatCountdown(ms) {
  if (ms <= 0) return 'Opening now';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `Opens in ${h}h ${m}m` : `Opens in ${m}m ${s}s`;
}

export const CandidateExamsPage = () => {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('available');
  const [nowMs, setNowMs] = useState(Date.now());
  const [showPrefs, setShowPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    theme: 'light',
    fontScale: 'md',
    layout: 'right',
    showTimer: true,
    highContrast: false,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await attemptService.getCandidateExams();
      setExams(res.data?.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    attemptService
      .getMyPreferences()
      .then((res) => {
        if (res.data?.preferences) setPrefs((p) => ({ ...p, ...res.data.preferences }));
      })
      .catch(() => {});
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await attemptService.updateMyPreferences(prefs);
      if (prefs.highContrast) setTheme('high-contrast');
      else if (prefs.theme) setTheme(prefs.theme);
      setShowPrefs(false);
      toast.success('Workspace preferences saved');
    } catch (err) {
      toast.error(err.message || 'Could not save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const available = exams.filter(
    (e) => e.derivedStatus === 'ongoing' && e.attemptStatus !== 'submitted' && e.attemptStatus !== 'graded'
  );
  const upcoming = exams.filter((e) => e.derivedStatus === 'published');
  const completed = exams.filter(
    (e) => e.derivedStatus === 'completed' || e.attemptStatus === 'submitted' || e.attemptStatus === 'graded'
  );

  const visible = tab === 'available' ? available : tab === 'upcoming' ? upcoming : completed;

  return (
    <main className="space-y-6">
      <PageHeader
        title="My Examinations"
        subtitle="View scheduled windows, instructions, and active attempts."
        breadcrumbs={[{ label: 'Candidate' }, { label: 'Examinations' }]}
        actions={
          <Button variant="secondary" onClick={() => setShowPrefs(true)}>
            <SlidersHorizontal className="w-4 h-4" /> Preferences
          </Button>
        }
      />

      {/* Unified 3-Card KPI Strip */}
      <section aria-label="Examination overview" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'available', label: 'Available Now', val: available.length, caption: 'Open for entry', icon: Play },
          { key: 'upcoming', label: 'Upcoming', val: upcoming.length, caption: 'Scheduled windows', icon: Calendar },
          { key: 'completed', label: 'Completed', val: completed.length, caption: 'Submitted & graded', icon: CheckCircle },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              type="button"
              key={kpi.key}
              onClick={() => setTab(kpi.key)}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-sm p-5 text-left hover:border-line-strong transition-colors flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
                  {kpi.label}
                </span>
                <Icon className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div className="font-display font-bold text-3xl text-[var(--ink)] tabular-nums tracking-[-0.03em]">
                {kpi.val}
              </div>
              <span className="text-xs text-[var(--muted)]">{kpi.caption}</span>
            </button>
          );
        })}
      </section>

      <Tabs
        items={[
          { key: 'available', label: `Available Now (${available.length})` },
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'completed', label: `Completed (${completed.length})` },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={tab === 'upcoming' ? Calendar : tab === 'completed' ? CheckCircle : Clock}
          title={`No ${tab} examinations`}
          description="Check other tabs or contact your examiner if an exam is missing."
        />
      ) : (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-white/[0.03] border-b border-[var(--line)] text-[var(--muted)] text-[11px] uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Examination</th>
                  <th className="px-4 py-3 font-medium">Window</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {visible.map((exam) => {
                  const opensInMs = Date.parse(exam.startAt) - nowMs;
                  const accessReason =
                    exam.attemptStatus === 'submitted' || exam.attemptStatus === 'graded'
                      ? 'Already submitted'
                      : exam.derivedStatus === 'published'
                      ? formatCountdown(opensInMs)
                      : exam.derivedStatus === 'completed'
                      ? 'Closed'
                      : 'Open for entry';

                  return (
                    <tr key={exam.id} className="group hover:bg-zinc-50/90 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3.5 max-w-md">
                        <div className="font-semibold text-sm text-[var(--ink)]">{exam.title}</div>
                        <div className="text-[11px] font-mono text-[var(--muted)] mt-0.5 tabular-nums">
                          {exam.durationMin}m · {exam.totalMarks} marks · {accessReason}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted)] tabular-nums">
                        {tab === 'upcoming'
                          ? `Opens ${new Date(exam.startAt).toLocaleString()}`
                          : `Closes ${new Date(exam.endAt).toLocaleString()}`}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={exam.derivedStatus === 'ongoing' ? 'cobalt' : 'neutral'}>
                            {exam.accessStatus || exam.derivedStatus}
                          </Badge>
                          {exam.attemptStatus === 'in_progress' && <Badge tone="warning">In Progress</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {tab === 'available' && (
                          <Link
                            to={`/candidate/exams/${exam.id}`}
                            className="min-h-[36px] inline-flex items-center gap-1.5 bg-[#0A0A0A] text-white dark:bg-[#F4F4F5] dark:text-[#0A0A0A] hover:opacity-90 text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm active:scale-[0.98] transition-all"
                          >
                            {exam.attemptStatus === 'in_progress' ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" /> Resume Exam
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" /> Enter Pre-Exam
                              </>
                            )}
                          </Link>
                        )}
                        {tab === 'upcoming' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--muted)] px-2.5 py-1.5 rounded-lg bg-canvas border border-[var(--line)] tabular-nums">
                            <Lock className="w-3.5 h-3.5" /> {formatCountdown(opensInMs)}
                          </span>
                        )}
                        {tab === 'completed' && exam.resultsPublished && exam.attemptId && (
                          <Button size="sm" variant="primary" onClick={() => navigate(`/candidate/results/${exam.attemptId}`)}>
                            <CheckCircle className="w-3.5 h-3.5" /> View Result
                          </Button>
                        )}
                        {tab === 'completed' && !exam.resultsPublished && (
                          <span className="text-xs font-mono text-[var(--muted)]">Results pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={showPrefs} onClose={() => setShowPrefs(false)} title="Workspace Preferences">
        <form onSubmit={handleSavePrefs} className="space-y-4">
          <Select
            label="Theme"
            value={prefs.theme}
            onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value }))}
          >
            <option value="light">Light (Alabaster)</option>
            <option value="dark">Dark (Obsidian)</option>
            <option value="system">System Default</option>
          </Select>

          <Select
            label="Font Scale"
            value={prefs.fontScale}
            onChange={(e) => setPrefs((p) => ({ ...p, fontScale: e.target.value }))}
          >
            <option value="sm">Compact (14px)</option>
            <option value="md">Standard (16px)</option>
            <option value="lg">Large (18px)</option>
          </Select>

          <Select
            label="Question Palette Layout"
            value={prefs.layout}
            onChange={(e) => setPrefs((p) => ({ ...p, layout: e.target.value }))}
          >
            <option value="right">Palette on Right</option>
            <option value="left">Palette on Left</option>
          </Select>

          <Switch
            label="Show countdown timer in workspace"
            checked={prefs.showTimer}
            onChange={(v) => setPrefs((p) => ({ ...p, showTimer: v }))}
          />

          <Switch
            label="High-contrast accessibility mode"
            checked={prefs.highContrast}
            onChange={(v) => setPrefs((p) => ({ ...p, highContrast: v }))}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowPrefs(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingPrefs}>
              Save Preferences
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
};
