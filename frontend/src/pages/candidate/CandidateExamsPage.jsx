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
        <EmptyState title={`No ${tab} examinations`} description="Check other tabs or contact your examiner if an exam is missing." />
      ) : (
        <div className="space-y-4">
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
              <article
                key={exam.id}
                className={`luxury-card luxury-card-hover rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-2 ${
                  exam.derivedStatus === 'ongoing' ? 'border-t-[#059669]' : 'border-t-[#0B0F0E]'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={exam.derivedStatus === 'ongoing' ? 'cobalt' : 'neutral'}>
                      {exam.accessStatus || exam.derivedStatus}
                    </Badge>
                    {exam.attemptStatus === 'in_progress' && <Badge tone="warning">In Progress</Badge>}
                    <span className="text-xs font-mono text-ink-muted">{accessReason}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-ink break-words">{exam.title}</h2>
                  {exam.instructions && (
                    <p className="text-xs text-ink-muted line-clamp-2 max-w-[70ch]">{exam.instructions}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {exam.durationMin} min
                    </span>
                    <span>{exam.totalMarks} marks</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {tab === 'upcoming' ? `Opens ${new Date(exam.startAt).toLocaleString()}` : `Closes ${new Date(exam.endAt).toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {tab === 'available' && (
                    <Link
                      to={`/candidate/exams/${exam.id}`}
                      className="min-h-[44px] inline-flex items-center gap-2 bg-[#0B0F0E] hover:bg-[#181F1D] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm active:scale-[0.98] transition-all"
                    >
                      {exam.attemptStatus === 'in_progress' ? (
                        <>
                          <RotateCcw className="w-4 h-4" /> Resume Exam
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Enter Pre-Exam
                        </>
                      )}
                    </Link>
                  )}
                  {tab === 'upcoming' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted px-3 py-2 rounded-lg bg-canvas border border-line">
                      <Lock className="w-3.5 h-3.5" /> {formatCountdown(opensInMs)}
                    </span>
                  )}
                  {tab === 'completed' && exam.resultsPublished && exam.attemptId && (
                    <Button variant="primary" onClick={() => navigate(`/candidate/results/${exam.attemptId}`)}>
                      <CheckCircle className="w-4 h-4" /> View Result
                    </Button>
                  )}
                  {tab === 'completed' && !exam.resultsPublished && (
                    <span className="text-xs font-mono text-ink-muted">Results pending publication</span>
                  )}
                </div>
              </article>
            );
          })}
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
