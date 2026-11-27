import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Skeleton, EmptyState, Tooltip, CopyButton, BentoAreaChart } from '../../components/ui';
import { ArrowRight, ShieldCheck, Printer, CheckCircle2 } from 'lucide-react';
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

  const avgPct = results.length
    ? Math.round(
        results.reduce((acc, r) => acc + ((r.score || 0) / Math.max(1, r.totalMarks || 1)) * 100, 0) /
          results.length
      )
    : 0;
  const verifiedCount = results.filter((r) => Boolean(r.verificationId)).length;

  return (
    <main className="space-y-8">
      <PageHeader
        title="Academic Transcripts"
        subtitle="Cryptographically verifiable examination results and official telemetry credentials."
        breadcrumbs={[{ label: 'Candidate', to: '/candidate' }, { label: 'Results' }]}
      />

      {/* High-Contrast Deep Obsidian Telemetry Header */}
      <section
        aria-label="Transcript summary"
        className="rounded-2xl bg-[#0B0F0E] border border-[#181F1D] text-white overflow-hidden shadow-lg"
      >
        <div className="px-6 py-4 border-b border-[#181F1D] flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.1em] text-[#10B981]">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            Verified Integrity Status · Ledger Synced
          </div>
          <span className="text-[11px] font-mono text-white/60 uppercase tracking-[0.08em]">
            Tabulation: Authoritative UTC
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#181F1D]">
          <div className="p-6">
            <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-white/60">Cumulative Average</div>
            <div className="font-display font-bold text-4xl text-white mt-1.5 tabular-nums tracking-[-0.03em]">
              {avgPct}%
            </div>
          </div>
          <div className="p-6">
            <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-white/60">Published Transcripts</div>
            <div className="font-display font-bold text-4xl text-white mt-1.5 tabular-nums tracking-[-0.03em]">
              {results.length}
            </div>
          </div>
          <div className="p-6">
            <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-white/60">Verified Credentials</div>
            <div className="font-display font-bold text-4xl text-[#10B981] mt-1.5 tabular-nums tracking-[-0.03em]">
              {verifiedCount}
            </div>
          </div>
        </div>
      </section>

      {/* Performance Trajectory Chart */}
      {!loading && results.length > 0 && (
        <section
          aria-label="Performance trajectory"
          className="min-w-0 rounded-2xl bg-surface dark:bg-[#111615] border border-line p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">Score Progression</p>
              <h2 className="text-lg font-display font-bold text-ink tracking-[-0.03em]">
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
              scorePct: Math.min(100, Math.max(0, Math.round(((r.score || 0) / Math.max(1, r.totalMarks || 1)) * 100))),
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
        <div className="space-y-4">
          {results.map((r) => {
            const pct = Math.min(100, Math.max(0, Math.round(((r.score || 0) / Math.max(1, r.totalMarks || 1)) * 100)));
            const radius = 32;
            const circumference = 2 * Math.PI * radius;
            const dashOffset = circumference - (pct / 100) * circumference;

            return (
              <article
                key={r.attemptId}
                className="luxury-card luxury-card-hover rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-5 min-w-0 flex-1">
                  {/* Surgical Emerald Score Ring */}
                  <div className="shrink-0 flex flex-col items-center">
                    <svg width="80" height="80" viewBox="0 0 80 80" aria-label={`Score ${pct}%`}>
                      <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--line)" strokeWidth="6" />
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 40 40)"
                        style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
                      />
                      <text x="40" y="45" textAnchor="middle" className="fill-ink font-mono text-sm font-semibold tabular-nums">
                        {pct}%
                      </text>
                    </svg>
                    <span className="text-[11px] font-mono text-ink-muted tabular-nums mt-1">
                      {r.score} / {r.totalMarks}
                    </span>
                  </div>

                  {/* Center Telemetry Metadata */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="eyebrow-rule font-mono text-[11px] uppercase tracking-[0.1em] text-[#065F46]">
                      CS-301 · Official Transcript
                    </p>
                    <h2 className="font-display font-semibold text-xl sm:text-2xl tracking-[-0.02em] text-ink leading-tight break-words">
                      {r.examTitle}
                    </h2>

                    {/* Visual Score Bar */}
                    <div className="max-w-sm space-y-1">
                      <div className="h-1.5 rounded-full bg-subtle overflow-hidden">
                        <div className="h-full bg-[#059669] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {r.submittedAt && (
                        <span className="text-xs font-mono text-ink-muted">
                          Issued {new Date(r.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                      {r.verificationId && (
                        <Tooltip label="Copy verification ID">
                          <CopyButton
                            value={r.verificationId}
                            className="px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] hover:border-[#059669] text-xs font-mono text-[#065F46]"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.75} />
                            <span>{r.verificationId}</span>
                          </CopyButton>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Button
                    variant="secondary"
                    loading={downloadingId === r.attemptId}
                    onClick={async () => {
                      setDownloadingId(r.attemptId);
                      try {
                        await attemptService.downloadAttemptPdf(r.attemptId);
                        toast.success('Transcript PDF downloaded');
                      } catch (err) {
                        toast.error(err.message || 'Failed to download PDF');
                      } finally {
                        setDownloadingId(null);
                      }
                    }}
                  >
                    <Printer className="w-4 h-4" strokeWidth={1.5} /> Download PDF
                  </Button>
                  <Button onClick={() => navigate(`/candidate/results/${r.attemptId}`)}>
                    View Transcript <ArrowRight className="w-4 h-4 text-[#10B981]" strokeWidth={1.75} />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};
