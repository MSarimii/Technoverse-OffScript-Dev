import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examService } from '../../services/examService';
import { useTheme } from '../../context/ThemeContext';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Skeleton, EmptyState, ErrorState, BentoAreaChart, BentoDonutChart } from '../../components/ui';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Eye, Activity, CheckSquare, BarChart3, FlaskConical, Send, AlertTriangle, MoreHorizontal, Scale, Flag, FileEdit, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

export const ExaminerDashboardPage = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
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

      {/* Minimalist 4-Card KPI Strip */}
      <section aria-label="Lifecycle summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'ongoing', label: 'Active Exams', val: counts.ongoing, caption: 'Live telemetry', icon: Activity },
          { key: 'draft', label: 'Drafts', val: counts.draft, caption: 'In authoring', icon: FileEdit },
          { key: 'published', label: 'Scheduled', val: counts.published, caption: 'Upcoming windows', icon: Clock },
          { key: 'completed', label: 'Completed', val: counts.completed, caption: 'Graded & closed', icon: CheckCircle2 },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              type="button"
              key={tile.key}
              onClick={() => setFilter(tile.key)}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 text-left hover:border-line-strong transition-colors flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">
                  {tile.label}
                </span>
                <Icon className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div className="font-display font-bold text-3xl text-[var(--ink)] tabular-nums tracking-[-0.03em]">
                {tile.val}
              </div>
              <span className="text-xs text-[var(--muted)]">{tile.caption}</span>
            </button>
          );
        })}
      </section>

      {/* Interactive Bento Analytics Row */}
      <section aria-label="Examination analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">Cohort Throughput</p>
              <h2 className="text-lg font-display font-bold text-[var(--ink)] tracking-[-0.03em]">
                Submission & Completion Trend
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[var(--muted)]">Last 7 cycles</span>
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

        <div className="min-w-0 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">Calibration</p>
            <h2 className="text-lg font-display font-bold text-[var(--ink)] tracking-[-0.03em]">
              Question Bank Difficulty Mix
            </h2>
          </div>
          <BentoDonutChart
            data={[
              { name: 'Easy (1.0)', value: 18, color: '#10B981' },
              { name: 'Medium (2.0)', value: 24, color: resolvedTheme === 'dark' ? '#F4F4F5' : '#0A0A0A' },
              { name: 'Hard (3.0)', value: 12, color: resolvedTheme === 'dark' ? '#64748B' : '#94A3B8' },
            ]}
          />
        </div>
      </section>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <section className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-sm p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.08em] text-status-review">
            <AlertTriangle className="w-4 h-4" strokeWidth={1.5} /> Needs Attention ({needsAttention.length})
          </div>
          <div className="divide-y divide-[var(--line)]">
            {needsAttention.map((ex) => (
              <div key={ex.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link to={`/examiner/exams/${ex.id}`} className="font-medium text-[var(--ink)] hover:text-[#059669] transition-colors">
                  {ex.title}
                </Link>
                <span className="text-xs font-mono text-[var(--muted)]">
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

      {/* Unified Directory Table */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
          {/* Recessed Pill Filter Track with Sliding Indicator */}
          <div className="inline-flex flex-wrap gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-white/[0.04] border border-[var(--line)]">
            {['all', 'draft', 'published', 'ongoing', 'completed'].map((st) => {
              const active = filter === st;
              return (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`relative px-3.5 py-1.5 rounded-md text-xs font-mono uppercase transition-colors ${
                    active ? 'text-[var(--ink)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={reduced ? undefined : 'exam-filter-pill'}
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 bg-[var(--surface)] rounded-md shadow-sm border border-[var(--line)] -z-0"
                    />
                  )}
                  <span className="relative z-10">{st}</span>
                </button>
              );
            })}
          </div>
          <span className="inline-flex items-center px-2.5 h-7 rounded-full bg-zinc-100 dark:bg-white/[0.06] border border-[var(--line)] text-[11px] font-mono tabular-nums text-[var(--muted)]">
            {visible.length} {visible.length === 1 ? 'exam' : 'exams'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No examinations match this filter" description="Create a new examination or switch filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-white/[0.03] border-b border-[var(--line)] text-[var(--muted)] text-[11px] uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Examination</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {visible.map((exam) => {
                  const st = exam.derivedStatus;
                  const isMenuOpen = openMenuId === exam.id;
                  const statusLabel =
                    st === 'ongoing' ? 'Live' : st === 'published' ? 'Scheduled' : st === 'completed' ? 'Completed' : 'Draft';

                  return (
                    <tr
                      key={exam.id}
                      className="group hover:bg-zinc-50/90 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/examiner/exams/${exam.id}`}
                          className="text-sm font-semibold text-[var(--ink)] hover:text-[#059669] transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>{exam.title}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--muted)]" />
                        </Link>
                        <p className="text-[11px] font-mono text-[var(--muted)] mt-0.5 tabular-nums">
                          {exam.courseCode || 'SEMS'} · {exam.durationMin}m · {exam.questionRefs?.length || 0} questions ·{' '}
                          {exam.enrolledCandidateIds?.length || 0} enrolled
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={st === 'ongoing' ? 'cobalt' : st === 'completed' ? 'success' : 'neutral'} dot={st === 'draft' ? 'slate' : undefined}>
                            {statusLabel}
                          </Badge>
                          {exam.resultsPublished && <Badge tone="success">Published</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end relative">
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
                              <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.5} /> Grade
                            </Button>
                          )}
                          {st === 'published' && (
                            <Button size="sm" variant="secondary" onClick={() => navigate(`/examiner/exams/${exam.id}`)}>
                              Configure
                            </Button>
                          )}

                          <div ref={isMenuOpen ? menuRef : undefined} className="relative">
                            <button
                              type="button"
                              aria-label={`More actions for ${exam.title}`}
                              aria-expanded={isMenuOpen}
                              aria-haspopup="menu"
                              onClick={() => setOpenMenuId(isMenuOpen ? null : exam.id)}
                              className="h-8 w-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-zinc-100 dark:hover:bg-white/5 inline-flex items-center justify-center transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
                            </button>

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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
};
