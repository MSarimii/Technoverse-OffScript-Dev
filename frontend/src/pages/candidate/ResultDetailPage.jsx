import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { examService } from '../../services/examService';
import { Button, Badge, Dialog, Select, Textarea, CopyButton } from '../../components/ui';
import { toast } from 'sonner';
import { Printer, ShieldCheck, ArrowLeft, ExternalLink, Flag } from 'lucide-react';

export const ResultDetailPage = () => {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disputeQ, setDisputeQ] = useState(null);
  const [viewingResponse, setViewingResponse] = useState(null);
  const [category, setCategory] = useState('grading_error');
  const [explanation, setExplanation] = useState('');
  const [submittedDisputes, setSubmittedDisputes] = useState({});
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    attemptService
      .getCandidateResultDetail(attemptId)
      .then(async (res) => {
        setData(res.data);
        const examId = res.data?.exam?.id || res.data?.attempt?.examId;
        if (examId) {
          const dispRes = await examService.getDisputes(examId).catch(() => null);
          const map = {};
          (dispRes?.data?.disputes || [])
            .filter((d) => d.attemptId === attemptId)
            .forEach((d) => {
              map[d.questionId] = d;
            });
          setSubmittedDisputes(map);
        }
      })
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

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await attemptService.downloadAttemptPdf(attemptId);
      toast.success('Transcript PDF downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print-transcript">
      <Link to="/candidate/results" className="no-print inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-ink mb-4">
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
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] text-ink">{exam?.title}</h1>
            <p className="text-sm font-mono text-ink-muted mt-1">
              Total Score: <strong className="text-ink">{score}</strong> / {totalMarks}
            </p>
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {attempt.verificationId && (
            <>
              <CopyButton
                value={attempt.verificationId}
                toastMessage="Verification ID copied"
                className="px-3 py-2 text-xs font-mono border border-line rounded-lg bg-canvas hover:bg-subtle"
              >
                <span>Copy ID</span>
              </CopyButton>
              <Link
                to={`/verify/${attempt.verificationId}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-line rounded-lg bg-canvas hover:bg-subtle"
              >
                <ShieldCheck className="w-4 h-4 text-status-answered" />
                {attempt.verificationId}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </>
          )}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#0B0F0E] hover:bg-[#181F1D] text-white rounded-lg active:scale-[0.97] disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {downloadingPdf ? 'Downloading...' : 'Download PDF Report'}
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
              <div className="mt-3 flex items-center justify-between">
                {submittedDisputes[q.id] ? (() => {
                  const disp = submittedDisputes[q.id];
                  const isUpheld = disp.status === 'resolved';
                  const isDismissed = disp.status === 'rejected';
                  return (
                    <button
                      type="button"
                      onClick={() => setViewingResponse(disp)}
                      className="inline-flex items-center hover:opacity-85 transition-opacity"
                    >
                      <Badge
                        tone={isUpheld ? 'success' : isDismissed ? 'neutral' : 'warning'}
                        dot={isDismissed ? 'slate' : undefined}
                      >
                        {isUpheld ? 'Upheld' : isDismissed ? 'Dismissed' : 'Challenge Pending'}
                      </Badge>
                    </button>
                  );
                })() : (
                  <Button variant="secondary" size="sm" onClick={() => setDisputeQ(q)}>
                    <Flag className="w-3.5 h-3.5" /> Challenge Answer
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(disputeQ)} onClose={() => setDisputeQ(null)} title="Challenge Answer">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!explanation.trim() || submittingDispute) return;
            setSubmittingDispute(true);
            try {
              const res = await attemptService.createDispute(attemptId, {
                questionId: disputeQ.id,
                category,
                explanation: explanation.trim(),
              });
              setSubmittedDisputes((prev) => ({ ...prev, [disputeQ.id]: res.data.dispute }));
              setDisputeQ(null);
              setExplanation('');
              toast.success('Challenge submitted for professor review');
            } catch (err) {
              toast.error(err.message);
            } finally {
              setSubmittingDispute(false);
            }
          }}
          className="space-y-4"
        >
          <Select label="Reason" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="grading_error">Grading Discrepancy</option>
            <option value="ambiguous_question">Ambiguous Question</option>
            <option value="technical_incident">Technical / Sync Issue</option>
          </Select>
          <Textarea
            label="Justification (max 1,000 chars)"
            required
            maxLength={1000}
            rows={4}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Describe the grading discrepancy or technical issue clearly..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDisputeQ(null)}>Cancel</Button>
            <Button type="submit" loading={submittingDispute}>Submit Challenge</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(viewingResponse)}
        onClose={() => setViewingResponse(null)}
        title="Challenge Status & Professor Response"
      >
        {viewingResponse && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-ink-muted">Status</span>
              <Badge
                tone={
                  viewingResponse.status === 'resolved'
                    ? 'success'
                    : viewingResponse.status === 'rejected'
                    ? 'neutral'
                    : 'warning'
                }
                dot={viewingResponse.status === 'rejected' ? 'slate' : undefined}
              >
                {viewingResponse.status === 'resolved'
                  ? 'Upheld'
                  : viewingResponse.status === 'rejected'
                  ? 'Dismissed'
                  : 'Challenge Pending'}
              </Badge>
            </div>
            <div className="p-3.5 rounded-xl bg-canvas border border-line">
              <div className="text-[11px] font-mono uppercase text-ink-muted mb-1">Your Justification</div>
              <p className="text-ink">{viewingResponse.explanation}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-canvas border border-line">
              <div className="text-[11px] font-mono uppercase text-ink-muted mb-1">Professor Response</div>
              <p className="text-ink">
                {viewingResponse.reason || 'Your challenge is queued for examiner review.'}
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setViewingResponse(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
};
