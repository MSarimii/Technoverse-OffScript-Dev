import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { USE_MOCK } from '../../services/api';
import { toast } from 'sonner';
import { Printer, ShieldCheck, ArrowLeft, ExternalLink } from 'lucide-react';

export const ResultDetailPage = () => {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attemptService
      .getCandidateResultDetail(attemptId)
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.message || 'Unable to load result detail'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return <div className="p-12 text-center font-mono text-sm text-ink-muted">Loading transcript...</div>;
  }

  if (!data?.attempt) {
    return <div className="p-12 text-center text-sm text-status-danger">Transcript unavailable.</div>;
  }

  const { attempt, exam } = data;
  const questions = attempt.snapshot?.questions || [];
  const score = attempt.scores?.total ?? 0;
  const totalMarks = exam?.totalMarks || 1;
  const pct = Math.min(100, Math.max(0, Math.round((score / totalMarks) * 100)));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const handleDownloadPdf = () => {
    if (USE_MOCK) {
      window.print();
      return;
    }
    window.open(attemptService.getAttemptReportUrl(attemptId), '_blank', 'noopener');
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/candidate/results" className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-ink mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to results
      </Link>

      <div className="bg-surface border border-line rounded-xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`Score ${pct}%`} className="shrink-0">
            <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--border-line)" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r={radius}
              fill="none"
              stroke="var(--status-answered)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
            />
            <text x="36" y="40" textAnchor="middle" className="fill-ink font-mono text-xs font-bold">
              {pct}%
            </text>
          </svg>
          <div>
            <h1 className="font-serif text-3xl text-ink">{exam?.title}</h1>
            <p className="text-sm font-mono text-ink-muted mt-1">
              Total Score: <strong className="text-ink">{score}</strong> / {totalMarks}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {attempt.verificationId && (
            <Link
              to={`/verify/${attempt.verificationId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-line rounded-md bg-canvas hover:bg-subtle"
            >
              <ShieldCheck className="w-4 h-4 text-status-answered" />
              {attempt.verificationId}
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-navy-900 text-white rounded-md active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            Download PDF Report
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const awarded = attempt.scores?.perQuestion?.[q.id] ?? 0;
          const ansVal = attempt.answers?.[q.id]?.value;
          const isLate = attempt.answers?.[q.id]?.lateSynced;
          return (
            <div key={q.id} className="bg-surface border border-line rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className="text-xs font-mono text-ink-muted">
                  Question {idx + 1} · {q.topic}
                </span>
                <div className="flex items-center gap-2">
                  {isLate && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      Late-Synced
                    </span>
                  )}
                  <span className="text-xs font-mono font-semibold text-ink">
                    {awarded} / {q.marks} marks
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-ink mb-2">{q.text}</p>
              <div className="text-xs font-mono text-ink-muted bg-canvas p-3 rounded border border-line">
                Your response:{' '}
                <span className="text-ink">
                  {Array.isArray(ansVal)
                    ? ansVal.join(', ') || '(No selection)'
                    : q.options?.find((o) => o.id === ansVal)?.text || ansVal || '(Unanswered)'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};
