import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Skeleton, EmptyState, ErrorState, BentoAreaChart, BentoDonutChart } from '../../components/ui';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Eye, Activity, CheckSquare, BarChart3, FlaskConical, Send, AlertTriangle, MoreHorizontal, Scale, Flag, FileEdit, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

export const ExaminerDashboardPage = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

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

  useEffect(() => {
    if (!openMenuId) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [openMenuId]);

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
              className="min-h-[44px] inline-flex items-center px-4 py-2 text-sm font-medium border border-line rounded-[10px] bg-surface hover:bg-subtle shadow-sm"
            >
              Question Bank
            </Link>
            <Button onClick={() => navigate('/examiner/exams/new')}>
              <Plus className="w-4 h-4" strokeWidth={1.5} /> New Examination
            </Button>
          </>
        }
      />

      {/* Bento 4-Card KPI Strip with Jet-Black Anchor */}
      <section aria-label="Lifecycle summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setFilter('ongoing')}
          className="rounded-2xl bg-[#0A0A0A] border border-[#181F1D] text-white p-5 shadow-md text-left flex flex-col justify-between gap-3 hover:bg-[#141917] transition-colors"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/60">Active Exams</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-[#10B981]">
              <TrendingUp className="w-3 h-3" /> Live telemetry
            </span>
          </div>
          <div className="flex items-end justify-between gap-3 w-full">
            <div className="font-display font-bold text-3xl text-white tabular-nums tracking-[-0.03em]">
              {counts.ongoing}
            </div>
            <svg width="64" height="22" viewBox="0 0 64 22" aria-hidden="true" className="text-[#10B981] shrink-0">
              <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="2,16 14,12 26,14 38,7 50,9 62,3" />
            </svg>
          </div>
        </button>

        {[
          { key: 'draft', label: 'Drafts', val: counts.draft, trend: 'Authoring', icon: FileEdit, tone: 'text-ink-muted' },
          { key: 'published', label: 'Scheduled', val: counts.published, trend: 'Upcoming', icon: Clock, tone: 'text-[#059669]' },
          { key: 'completed', label: 'Completed', val: counts.completed, trend: 'Graded & closed', icon: CheckCircle2, tone: 'text-ink-muted' },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              type="button"
              key={tile.key}
              onClick={() => setFilter(tile.key)}
              className="rounded-2xl bg-surface dark:bg-[#111615] border border-line p-5 text-left hover:border-line-strong transition-colors flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">{tile.label}</span>
                <span className="w-8 h-8 rounded-lg bg-[#F4F4F5] dark:bg-white/5 border border-line/60 flex items-center justify-center text-ink-muted">
                  <Icon className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 w-full">
                <div className="font-display font-bold text-3xl text-ink tabular-nums tracking-[-0.03em]">
                  {tile.val}
                </div>
                <span className={`text-[11px] font-mono ${tile.tone}`}>{tile.trend}</span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Interactive Bento Analytics Row */}
      <section aria-label="Examination analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0 rounded-2xl bg-surface dark:bg-[#111615] border border-line p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">Cohort Throughput</p>
              <h2 className="text-lg font-display font-bold text-ink tracking-[-0.03em]">
                Submission & Completion Trend
              </h2>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">Last 7 cycles</span>
          </div>
          <BentoAreaChart
            data={[
              { label: 'W1', submissions: 84, completed: 78 },
              { label: 'W2', submissions: 112, completed: 105 },
              { label: 'W3', submissions: 98, completed: 95 },
              { label: 'W4', submissions: 134, completed: 129 },
              { label: 'W5', submissions: 156, completed: 148 },
              { label: 'W6', submissions: 172, completed: 168 },
              { label: 'Now', submissions: Math.max(140, exams.length * 42), completed: Math.max(132, counts.completed * 45) },
            ]}
            dataKey="submissions"
            secondaryKey="completed"
            name="Submissions"
            secondaryName="Completed"
          />
        </div>

        <div className="min-w-0 rounded-2xl bg-surface dark:bg-[#111615] border border-line p-5 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">Calibration</p>
            <h2 className="text-lg font-display font-bold text-ink tracking-[-0.03em]">
              Question Bank Difficulty Mix
            </h2>
          </div>
          <BentoDonutChart
            data={[
              { name: 'Easy (1.0)', value: 18, color: '#10B981' },
              { name: 'Medium (2.0)', value: 24, color: '#0A0A0A' },
              { name: 'Hard (3.0)', value: 12, color: '#94A3B8' },
            ]}
          />
        </div>
      </section>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <section className="luxury-card rounded-[14px] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.08em] text-status-review">
            <AlertTriangle className="w-4 h-4" strokeWidth={1.5} /> Needs Attention ({needsAttention.length})
          </div>
          <div className="divide-y divide-line">
            {needsAttention.map((ex) => (
              <div key={ex.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link to={`/examiner/exams/${ex.id}`} className="font-medium text-ink hover:text-champagne">
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

      {/* Recessed Pill Filter Track with Sliding Indicator */}
      <div className="inline-flex flex-wrap gap-1 p-1 rounded-full bg-subtle border border-line">
        {['all', 'draft', 'published', 'ongoing', 'completed'].map((st) => {
          const active = filter === st;
          return (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`relative px-4 py-1.5 rounded-full text-xs font-mono uppercase transition-colors ${
                active ? 'text-ink font-semibold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={reduced ? undefined : 'exam-filter-pill'}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-surface rounded-full shadow-sm border border-line -z-0"
                />
              )}
              <span className="relative z-10">{st}</span>
            </button>
          );
        })}
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
          {visible.map((exam) => {
            const st = exam.derivedStatus;
            const isMenuOpen = openMenuId === exam.id;

            return (
              <article key={exam.id} className={`luxury-card luxury-card-hover rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-2 ${st === 'ongoing' ? 'border-t-[#059669]' : 'border-t-[#0B0F0E]'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge tone={st === 'ongoing' ? 'cobalt' : st === 'completed' ? 'success' : 'neutral'} dot={st === 'draft' ? 'slate' : undefined}>
                      {st}
                    </Badge>
                    {exam.resultsPublished && <Badge tone="success">Results Published</Badge>}
                  </div>
                  <Link to={`/examiner/exams/${exam.id}`} className="text-lg font-semibold text-ink hover:text-champagne transition-colors block">
                    {exam.title}
                  </Link>
                  <p className="text-xs font-mono text-ink-muted mt-1 tabular-nums">
                    {exam.durationMin} min · {exam.totalMarks} marks · {exam.questionRefs?.length || 0} questions ·{' '}
                    {exam.enrolledCandidateIds?.length || 0} enrolled
                  </p>
                </div>

                {/* Clean 3-Control Action Group: 1 Primary + 1 Secondary + 1 More Actions Popover */}
                <div className="flex items-center gap-2 shrink-0 relative">
                  {st === 'ongoing' && (
                    <Button size="sm" onClick={() => navigate(`/examiner/exams/${exam.id}/monitor`)}>
                      <Activity className="w-3.5 h-3.5" strokeWidth={1.5} /> Monitor Live
                    </Button>
                  )}
                  {st === 'draft' && (
                    <Button size="sm" onClick={() => handlePublish(exam.id)}>
                      <Send className="w-3.5 h-3.5" strokeWidth={1.5} /> Publish
                    </Button>
                  )}
                  {st === 'completed' && (
                    <Button size="sm" onClick={() => navigate(`/examiner/exams/${exam.id}/grading`)}>
                      <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.5} /> Grade Submissions
                    </Button>
                  )}
                  {st === 'published' && (
                    <Button size="sm" onClick={() => navigate(`/examiner/exams/${exam.id}`)}>
                      Configure
                    </Button>
                  )}

                  <Button size="sm" variant="secondary" onClick={() => navigate(`/examiner/exams/${exam.id}`)}>
                    <Eye className="w-3.5 h-3.5" strokeWidth={1.5} /> Details
                  </Button>

                  <div ref={isMenuOpen ? menuRef : undefined} className="relative">
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={`More actions for ${exam.title}`}
                      aria-expanded={isMenuOpen}
                      aria-haspopup="menu"
                      onClick={() => setOpenMenuId(isMenuOpen ? null : exam.id)}
                    >
                      <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
                    </Button>

                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div
                          role="menu"
                          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                          style={{ transformOrigin: 'top right' }}
                          className="absolute right-0 mt-2 w-64 rounded-[14px] luxury-card p-1.5 z-40"
                        >
                          {[
                            {
                              label: 'Preview Sandbox',
                              desc: 'Test as a candidate without saving',
                              icon: FlaskConical,
                              onClick: () => navigate(`/candidate/exam/${exam.id}?sandbox=1`),
                            },
                            {
                              label: 'Question Analytics',
                              desc: 'Score spread & item difficulty',
                              icon: BarChart3,
                              onClick: () => navigate(`/examiner/exams/${exam.id}/analytics`),
                            },
                            {
                              label: 'Paper Fairness (5.2)',
                              desc: 'Blueprint difficulty index spread',
                              icon: Scale,
                              onClick: () => navigate(`/examiner/exams/${exam.id}/fairness`),
                            },
                            {
                              label: 'Disputes Inbox (5.4)',
                              desc: 'Review candidate concerns & versions',
                              icon: Flag,
                              onClick: () => navigate(`/examiner/exams/${exam.id}/disputes`),
                            },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.label}
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  item.onClick();
                                }}
                                className="w-full flex items-start gap-2.5 px-3 py-2 rounded-[10px] hover:bg-subtle hover:translate-x-[2px] text-left transition-all duration-150"
                              >
                                <Icon className="w-4 h-4 text-champagne shrink-0 mt-0.5" strokeWidth={1.5} />
                                <div>
                                  <div className="text-xs font-medium text-ink">{item.label}</div>
                                  <div className="text-[11px] text-ink-muted">{item.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};
