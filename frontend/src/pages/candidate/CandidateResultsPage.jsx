import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { USE_MOCK } from '../../services/api';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Skeleton, EmptyState } from '../../components/ui';
import { ArrowRight, ShieldCheck, Copy, Printer } from 'lucide-react';
import { toast } from 'sonner';

export const CandidateResultsPage = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

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
        subtitle="Official finalized examination results and verifiable credentials."
        breadcrumbs={[{ label: 'Candidate', to: '/candidate' }, { label: 'Results' }]}
      />

      {/* Editorial 3-Column Summary Strip */}
      <section aria-label="Transcript summary" className="grid grid-cols-1 sm:grid-cols-3 border border-line divide-y sm:divide-y-0 sm:divide-x divide-line luxury-card rounded-[14px] overflow-hidden">
        <div className="p-5">
          <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink-muted">Cumulative Average</div>
          <div className="font-serif text-4xl text-ink mt-1 tabular-nums">{avgPct}%</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink-muted">Published Transcripts</div>
          <div className="font-serif text-4xl text-ink mt-1 tabular-nums">{results.length}</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink-muted">Verified Credentials</div>
          <div className="font-serif text-4xl text-champagne-deep mt-1 tabular-nums">{verifiedCount}</div>
        </div>
      </section>

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
                className="luxury-card rounded-[14px] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-5 min-w-0">
                  {/* Deep Emerald & Brass Score Ring */}
                  <div className="shrink-0 flex flex-col items-center">
                    <svg width="80" height="80" viewBox="0 0 80 80" aria-label={`Score ${pct}%`}>
                      <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--line)" strokeWidth="6" />
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="none"
                        stroke="#143D2F"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 40 40)"
                        style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
                      />
                      <text x="40" y="44" textAnchor="middle" className="fill-ink font-mono text-sm font-semibold">
                        {pct}%
                      </text>
                    </svg>
                    <span className="text-[11px] font-mono text-ink-muted tabular-nums mt-1">
                      {r.score} / {r.totalMarks}
                    </span>
                  </div>

                  {/* Center Metadata */}
                  <div className="min-w-0 space-y-1.5">
                    <p className="eyebrow-rule font-mono text-[11px] uppercase tracking-[0.1em] text-champagne-deep">
                      Official Transcript
                    </p>
                    <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight break-words">
                      {r.examTitle}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {r.submittedAt && (
                        <span className="text-xs font-mono text-ink-muted">
                          Issued {new Date(r.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                      {r.verificationId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(r.verificationId);
                            toast.success(`Copied ${r.verificationId}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-subtle border border-line hover:border-champagne text-xs font-mono text-ink transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-champagne-deep" strokeWidth={1.5} />
                          <span>{r.verificationId}</span>
                          <Copy className="w-3 h-3 text-ink-muted" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (USE_MOCK) navigate(`/candidate/results/${r.attemptId}`);
                      else window.open(attemptService.getAttemptReportUrl(r.attemptId), '_blank', 'noopener');
                    }}
                  >
                    <Printer className="w-4 h-4" strokeWidth={1.5} /> Download PDF
                  </Button>
                  <Button onClick={() => navigate(`/candidate/results/${r.attemptId}`)}>
                    View Transcript <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
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
