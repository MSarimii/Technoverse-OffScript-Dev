import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Skeleton, EmptyState, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import { Plus, Eye, Activity, CheckSquare, BarChart3, FlaskConical, Send, AlertTriangle } from 'lucide-react';

export const ExaminerDashboardPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await examService.getExams();
      setExams(res.data?.exams || []);
    } catch (err) {
      setError(err.message || 'Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePublish = async (id) => {
    try {
      await examService.publishExam(id);
      toast.success('Examination published');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const counts = {
    draft: exams.filter((e) => e.derivedStatus === 'draft').length,
    published: exams.filter((e) => e.derivedStatus === 'published').length,
    ongoing: exams.filter((e) => e.derivedStatus === 'ongoing').length,
    completed: exams.filter((e) => e.derivedStatus === 'completed').length,
  };

  const needsAttention = exams.filter(
    (e) =>
      (e.derivedStatus === 'completed' && !e.resultsPublished) ||
      (e.derivedStatus === 'published' && Date.parse(e.startAt) - Date.now() < 48 * 3600 * 1000) ||
      e.derivedStatus === 'ongoing'
  );

  const visible = filter === 'all' ? exams : exams.filter((e) => e.derivedStatus === filter);

  return (
    <main className="space-y-6">
      <PageHeader
        title="Examiner Console"
        subtitle="Create, sandbox-test, monitor, grade, and analyze examinations."
        breadcrumbs={[{ label: 'Examiner' }, { label: 'Dashboard' }]}
        actions={
          <>
            <Link
              to="/examiner/questions"
              className="min-h-[44px] inline-flex items-center px-4 py-2 text-sm font-medium border border-line rounded-lg bg-surface hover:bg-subtle"
            >
              Question Bank
            </Link>
            <Link
              to="/examiner/exams/new"
              className="min-h-[44px] inline-flex items-center gap-1.5 bg-cobalt hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-lg active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" /> New Examination
            </Link>
          </>
        }
      />

      {/* Hairline-Separated KPI Strip with Serif Numerals & Sparklines */}
      <section aria-label="Lifecycle summary" className="grid grid-cols-2 sm:grid-cols-4 border-y border-line divide-y sm:divide-y-0 sm:divide-x divide-line bg-surface rounded-[14px]">
        {[
          { key: 'draft', label: 'Drafts', val: counts.draft, pts: '0,14 12,10 24,12 36,6 48,8' },
          { key: 'published', label: 'Scheduled', val: counts.published, pts: '0,16 12,14 24,8 36,10 48,4' },
          { key: 'ongoing', label: 'Ongoing Live', val: counts.ongoing, pts: '0,12 12,8 24,4 36,6 48,2' },
          { key: 'completed', label: 'Completed', val: counts.completed, pts: '0,16 12,12 24,10 36,4 48,3' },
        ].map((tile) => (
          <button
            key={tile.key}
            onClick={() => setFilter(tile.key)}
            className="p-5 text-left hover:bg-subtle/50 transition-colors flex items-end justify-between gap-2"
          >
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink-muted">{tile.label}</div>
              <div className="font-serif text-4xl text-ink mt-1 tabular-nums">{tile.val}</div>
            </div>
            <svg width="48" height="18" viewBox="0 0 48 18" aria-hidden="true" className="text-champagne shrink-0">
              <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={tile.pts} />
            </svg>
          </button>
        ))}
      </section>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <section className="bg-surface border border-line rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-status-review">
            <AlertTriangle className="w-4 h-4" /> Needs Attention ({needsAttention.length})
          </div>
          <div className="divide-y divide-line">
            {needsAttention.map((ex) => (
              <div key={ex.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link to={`/examiner/exams/${ex.id}`} className="font-medium text-ink hover:text-cobalt">
                  {ex.title}
                </Link>
                <span className="text-xs font-mono text-ink-muted">
                  {ex.derivedStatus === 'ongoing'
                    ? 'Live now — Monitor active attempts'
                    : ex.derivedStatus === 'completed'
                    ? 'Unpublished results — Review & publish'
                    : 'Starting soon'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {['all', 'draft', 'published', 'ongoing', 'completed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase border ${
              filter === st ? 'bg-cobalt text-white border-cobalt' : 'bg-surface border-line text-ink-muted hover:text-ink'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState title="No examinations match this filter" description="Create a new examination or switch filters." />
      ) : (
        <div className="space-y-4">
          {visible.map((exam) => (
            <article key={exam.id} className="bg-surface border border-line rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={exam.derivedStatus === 'ongoing' ? 'cobalt' : 'neutral'}>
                      {exam.derivedStatus}
                    </Badge>
                    {exam.resultsPublished && <Badge tone="success">Results Published</Badge>}
                  </div>
                  <Link to={`/examiner/exams/${exam.id}`} className="text-lg font-semibold text-ink hover:text-cobalt">
                    {exam.title}
                  </Link>
                  <p className="text-xs font-mono text-ink-muted mt-1">
                    {exam.durationMin} min · {exam.totalMarks} marks · {exam.questionRefs?.length || 0} questions ·{' '}
                    {exam.enrolledCandidateIds?.length || 0} enrolled
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/candidate/exam/${exam.id}?sandbox=1`)}
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-status-review" /> Sandbox
                  </Button>
                  {exam.status === 'draft' && (
                    <Button size="sm" onClick={() => handlePublish(exam.id)}>
                      <Send className="w-3.5 h-3.5" /> Publish
                    </Button>
                  )}
                  <Link
                    to={`/examiner/exams/${exam.id}`}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-lg bg-canvas hover:bg-subtle"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </Link>
                  {exam.derivedStatus === 'ongoing' && (
                    <Link
                      to={`/examiner/exams/${exam.id}/monitor`}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-lg bg-canvas hover:bg-subtle"
                    >
                      <Activity className="w-3.5 h-3.5 text-cobalt" /> Monitor
                    </Link>
                  )}
                  <Link
                    to={`/examiner/exams/${exam.id}/grading`}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-lg bg-canvas hover:bg-subtle"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-status-answered" /> Grade
                  </Link>
                  <Link
                    to={`/examiner/exams/${exam.id}/analytics`}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-lg bg-canvas hover:bg-subtle"
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> Analytics
                  </Link>
                  <Link
                    to={`/examiner/exams/${exam.id}/fairness`}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-lg bg-canvas hover:bg-subtle"
                  >
                    Fairness
                  </Link>
                  <Link
                    to={`/examiner/exams/${exam.id}/disputes`}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-lg bg-canvas hover:bg-subtle"
                  >
                    Disputes
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};
