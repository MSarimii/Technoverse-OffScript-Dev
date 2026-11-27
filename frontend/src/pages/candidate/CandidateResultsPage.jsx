import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { Award, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const CandidateResultsPage = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attemptService
      .getCandidateResults()
      .then((res) => setResults(res.data?.results || []))
      .catch((err) => toast.error(err.message || 'Failed to load results'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-ink">Published Results</h1>
        <p className="text-sm text-ink-muted">Only finalized and published examination transcripts appear here.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center font-mono text-sm text-ink-muted">Loading results...</div>
      ) : results.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-10 text-center text-sm text-ink-muted">
          No published results are available yet.
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <div
              key={r.attemptId}
              className="bg-surface border border-line rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-ink">{r.examTitle}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-ink-muted mt-1">
                  <span className="inline-flex items-center gap-1 text-status-answered font-semibold">
                    <Award className="w-3.5 h-3.5" /> Score: {r.score} / {r.totalMarks}
                  </span>
                  {r.verificationId && (
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {r.verificationId}
                    </span>
                  )}
                </div>
              </div>
              <Link
                to={`/candidate/results/${r.attemptId}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline"
              >
                View transcript
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};
