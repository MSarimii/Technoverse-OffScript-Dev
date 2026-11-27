import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Skeleton, EmptyState, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Eye, Activity, CheckSquare, BarChart3, FlaskConical, Send, AlertTriangle, MoreHorizontal, Scale, Flag } from 'lucide-react';

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

      {/* Hairline-Separated KPI Strip with Serif Numerals & Sparklines */}
      <section aria-label="Lifecycle summary" className="grid grid-cols-2 sm:grid-cols-4 border border-line divide-y sm:divide-y-0 sm:divide-x divide-line luxury-card rounded-[14px] overflow-hidden">
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
              <article key={exam.id} className="luxury-card rounded-[14px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge tone={st === 'ongoing' ? 'cobalt' : st === 'completed' ? 'success' : 'neutral'}>
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
