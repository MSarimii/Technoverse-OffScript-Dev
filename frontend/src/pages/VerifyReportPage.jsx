import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../services/attemptService';
import { motion, useReducedMotion } from 'framer-motion';
import { XCircle, Search, Award } from 'lucide-react';
import { Button } from '../components/ui';

export const VerifyReportPage = () => {
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
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
    <main className="max-w-2xl mx-auto px-4 py-14">
      <div className="luxury-card rounded-2xl p-7 sm:p-10">
        <p className="eyebrow-rule font-mono text-[11px] uppercase tracking-[0.12em] text-[#059669] mb-3">
          Public Transcript Registry
        </p>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] text-ink mb-2">Verify Examination Report</h1>
        <p className="text-sm text-ink-muted mb-7 max-w-[55ch]">
          Confirm authenticity using the verification identifier printed on the official PDF transcript. Only minimal metadata is disclosed.
        </p>

        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2.5 mb-8">
          <input
            type="text"
            aria-label="Verification identifier"
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
            placeholder="e.g. VER-2026-SEMS-8841"
            className="flex-1 min-h-[44px] px-3.5 py-2 text-sm font-mono bg-subtle/60 border border-line rounded-[10px] text-ink"
          />
          <Button type="submit">
            <Search className="w-4 h-4" strokeWidth={1.5} /> Verify
          </Button>
        </form>

        {loading && (
          <div className="p-4 rounded-[10px] bg-subtle/60 border border-line text-xs font-mono text-ink-muted">
            Checking verification registry...
          </div>
        )}

        {rateLimited && (
          <div role="alert" className="p-4 rounded-[10px] bg-amber-500/10 border border-status-review/40 text-sm text-status-review">
            Too many verification requests. Please wait a moment and try again.
          </div>
        )}

        {!loading && !rateLimited && result && (
          <div
            role="status"
            className={`p-2 rounded-[14px] border ${
              result.valid ? 'border-champagne/40 bg-subtle/40' : 'border-status-danger/40 bg-red-500/10'
            }`}
          >
            <div className={`p-6 sm:p-7 rounded-[10px] border ${result.valid ? 'border-champagne/60 bg-surface' : 'border-transparent'}`}>
              {result.valid ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-line pb-4">
                    <div className="flex items-center gap-3.5">
                      <motion.div
                        initial={reduced ? false : { scale: 1.12, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                        className="w-12 h-12 rounded-full border-2 border-champagne bg-subtle/60 flex items-center justify-center text-champagne"
                      >
                        <Award className="w-6 h-6" strokeWidth={1.5} />
                      </motion.div>
                      <div>
                        <div className="font-display font-bold text-2xl text-[#059669] tracking-[0.06em] leading-none">VALID</div>
                        <div className="text-[11px] font-mono text-ink-muted mt-1">
                          Official Academic Credential · Verified Authentic
                        </div>
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-[11px] font-mono uppercase text-ink-muted">Examination</dt>
                      <dd className="font-medium text-ink mt-0.5">{result.examTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-mono uppercase text-ink-muted">Candidate (Masked)</dt>
                      <dd className="font-mono text-ink mt-0.5">
                        {result.candidateMasked || result.maskedCandidateName}
                        {result.rollNoMasked ? ` (${result.rollNoMasked})` : ''}
                      </dd>
                    </div>
                    {result.score && (
                      <div>
                        <dt className="text-[11px] font-mono uppercase text-ink-muted">Verified Score</dt>
                        <dd className="font-mono font-semibold text-ink mt-0.5">
                          {result.score.totalScore} / {result.score.maxScore} ({result.score.percentage}%)
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[11px] font-mono uppercase text-ink-muted">Issued Date</dt>
                      <dd className="font-mono text-ink mt-0.5">{new Date(result.issuedAt).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-mono uppercase text-ink-muted">Verification ID</dt>
                      <dd className="font-mono text-champagne font-semibold mt-0.5">{result.code || verificationId}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-status-danger shrink-0" strokeWidth={1.5} />
                  <div>
                    <div className="font-semibold text-ink">Unrecognized Verification Identifier</div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Confirm the code printed on the official transcript and try again.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
