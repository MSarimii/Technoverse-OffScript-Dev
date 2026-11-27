import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Skeleton, EmptyState, Tooltip, CopyButton, BentoAreaChart } from '../../components/ui';
import { ArrowRight, ShieldCheck, Printer, Award, FileCheck2 } from 'lucide-react';
import { toast } from 'sonner';

export const CandidateResultsPage = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    attemptService
      .getCandidateResults()
      .then((res) => setResults(res.data?.results || []))
      .catch((err) => toast.error(err.message || 'Failed to load results'))
      .finally(() => setLoading(false));
  }, []);

  const getPct = (r) => {
    if (typeof r.percentage === 'number') return Math.min(100, Math.max(0, Math.round(r.percentage)));
    const score = r.totalScore ?? r.score ?? 0;
    const max = Math.max(1, r.maxScore ?? r.totalMarks ?? 1);
    return Math.min(100, Math.max(0, Math.round((score / max) * 100)));
  };

  const avgPct = results.length
    ? Math.round(results.reduce((acc, r) => acc + getPct(r), 0) / results.length)
    : 0;
  const verifiedCount = results.filter((r) => Boolean(r.verificationId || r.gradingStatus === 'complete')).length;

  return (
    <main className="space-y-8">
      <PageHeader
        title="Academic Transcripts"
        subtitle="Cryptographically verifiable examination results and official telemetry credentials."
        breadcrumbs={[{ label: 'Candidate', to: '/candidate' }, { label: 'Results' }]}
      />

      {/* Unified 3-Card KPI Strip */}
      <section aria-label="Transcript summary" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Cumulative Average', val: `${avgPct}%`, caption: 'Weighted across transcripts', icon: Award },
          { label: 'Published Transcripts', val: results.length, caption: 'Graded & finalized', icon: FileCheck2 },
          { label: 'Verified Credentials', val: verifiedCount, caption: 'Cryptographically signed', icon: ShieldCheck },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-sm p-5 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">
                  {kpi.label}
                </span>
                <Icon className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div className="font-display font-bold text-3xl text-[var(--ink)] tabular-nums tracking-[-0.03em]">
                {kpi.val}
              </div>
              <span className="text-xs text-[var(--muted)]">{kpi.caption}</span>
            </div>
          );
        })}
      </section>

      {/* Performance Trajectory Chart */}
      {!loading && results.length > 0 && (
        <section
          aria-label="Performance trajectory"
          className="min-w-0 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">Score Progression</p>
              <h2 className="text-lg font-display font-bold text-[var(--ink)] tracking-[-0.03em]">
                Performance Trajectory
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#059669] dark:text-[#34D399]">
              Avg {avgPct}% across {results.length} {results.length === 1 ? 'exam' : 'exams'}
            </span>
          </div>
          <BentoAreaChart
            data={results.map((r, i) => ({
              label: r.examTitle ? (r.examTitle.length > 16 ? `${r.examTitle.slice(0, 14)}…` : r.examTitle) : `Exam ${i + 1}`,
              scorePct: getPct(r),
            }))}
            dataKey="scorePct"
            name="Score"
            suffix="%"
            height={180}
          />
        </section>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          title="No published results yet"
          description="Your examination transcripts will appear here once graded and published by your examiner."
        />
      ) : (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-white/[0.03] border-b border-[var(--line)] text-[var(--muted)] text-[11px] uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Examination &amp; Credential</th>
                  <th className="px-4 py-3 font-medium">Issued</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {results.map((r) => {
                  const score = r.totalScore ?? r.score ?? 0;
                  const maxScore = r.maxScore ?? r.totalMarks ?? 1;
                  const pct = getPct(r);
                  const aid = r.attemptId || r.id;
                  return (
                    <tr
                      key={aid}
                      className="group hover:bg-zinc-50/90 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-sm text-[var(--ink)]">{r.examTitle}</div>
                        {r.verificationId && (
                          <div className="mt-1">
                            <Tooltip label="Copy verification ID">
                              <CopyButton
                                value={r.verificationId}
                                className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.05] border border-[var(--line)] hover:border-[#059669] text-[11px] font-mono text-[var(--muted)] hover:text-[var(--ink)]"
                              >
                                <ShieldCheck className="w-3 h-3 text-[#10B981]" strokeWidth={1.75} />
                                <span>{r.verificationId}</span>
                              </CopyButton>
                            </Tooltip>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted)] tabular-nums">
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] dark:bg-emerald-500/10 border border-[#A7F3D0] dark:border-emerald-500/20 text-xs font-semibold text-[#065F46] dark:text-emerald-400">
                          {pct}% <span className="font-normal opacity-75">({score}/{maxScore})</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={downloadingId === aid}
                            onClick={async () => {
                              setDownloadingId(aid);
                              try {
                                await attemptService.downloadAttemptPdf(aid);
                                toast.success('Transcript PDF downloaded');
                              } catch (err) {
                                toast.error(err.message || 'Failed to download PDF');
                              } finally {
                                setDownloadingId(null);
                              }
                            }}
                          >
                            <Printer className="w-3.5 h-3.5" strokeWidth={1.5} /> PDF
                          </Button>
                          <Button size="sm" onClick={() => navigate(`/candidate/results/${r.attemptId}`)}>
                            View Transcript <ArrowRight className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={1.75} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
};
