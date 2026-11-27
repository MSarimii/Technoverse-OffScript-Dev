import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../services/attemptService';
import { CheckCircle2, XCircle, Search, ShieldCheck } from 'lucide-react';

export const VerifyReportPage = () => {
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const [queryId, setQueryId] = useState(verificationId || '');
  const [result, setResult] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!verificationId) return;
    let active = true;
    setLoading(true);
    setRateLimited(false);
    attemptService
      .verifyReport(verificationId)
      .then((res) => {
        if (active) setResult(res.data || res);
      })
      .catch((err) => {
        if (active) {
          if (err.statusCode === 429 || err.code === 'RATE_LIMITED') {
            setRateLimited(true);
            setResult(null);
          } else {
            setResult({ valid: false });
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [verificationId]);

  const handleLookup = (e) => {
    e.preventDefault();
    if (queryId.trim()) {
      navigate(`/verify/${encodeURIComponent(queryId.trim())}`);
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-surface border border-line rounded-lg p-6 sm:p-8">
        <div className="flex items-center gap-2 text-navy-800 mb-2">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-mono uppercase tracking-wider">Public Transcript Verification</span>
        </div>
        <h1 className="font-serif text-3xl text-ink mb-2">Verify Examination Report</h1>
        <p className="text-sm text-ink-muted mb-6">
          Confirm authenticity using the verification identifier printed on the official PDF report. Only minimal verification metadata is displayed.
        </p>

        <form onSubmit={handleLookup} className="flex gap-2 mb-6">
          <input
            type="text"
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
            placeholder="e.g. VER-2026-SEMS-8841"
            className="flex-1 px-3 py-2 text-sm font-mono bg-canvas border border-line rounded-md text-ink focus:outline-none focus:ring-2 focus:ring-navy-800"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-md active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            Verify
          </button>
        </form>

        {loading && (
          <div className="p-4 rounded-md bg-canvas border border-line text-sm font-mono text-ink-muted">
            Checking verification registry...
          </div>
        )}

        {rateLimited && (
          <div role="alert" className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-sm text-amber-950">
            Too many verification requests. Please wait a moment and try again.
          </div>
        )}

        {!loading && !rateLimited && result && (
          <div
            className={`p-5 rounded-md border ${
              result.valid ? 'bg-emerald-50/60 border-emerald-300' : 'bg-red-50/60 border-red-300'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-3">
              {result.valid ? (
                <CheckCircle2 className="w-5 h-5 text-status-answered" />
              ) : (
                <XCircle className="w-5 h-5 text-status-danger" />
              )}
              <span className="font-semibold text-ink">
                {result.valid ? 'Authentic Examination Record' : 'Invalid or Unrecognized Verification ID'}
              </span>
            </div>

            {result.valid && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-3 border-t border-emerald-200">
                <div>
                  <dt className="text-xs text-ink-muted">Examination</dt>
                  <dd className="font-medium text-ink">{result.examTitle}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Candidate (Masked)</dt>
                  <dd className="font-mono text-ink">{result.maskedCandidateName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Issued Date</dt>
                  <dd className="font-mono text-ink">
                    {new Date(result.issuedAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Verification ID</dt>
                  <dd className="font-mono text-ink">{verificationId}</dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
