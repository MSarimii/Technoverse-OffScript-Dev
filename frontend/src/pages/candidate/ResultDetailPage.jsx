import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { USE_MOCK } from '../../services/api';
import { Button, Dialog, Select, Textarea } from '../../components/ui';
import { toast } from 'sonner';
import { Printer, ShieldCheck, ArrowLeft, ExternalLink, Copy, Flag } from 'lucide-react';

export const ResultDetailPage = () => {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disputeQ, setDisputeQ] = useState(null);
  const [category, setCategory] = useState('grading_error');
  const [explanation, setExplanation] = useState('');
  const [submittedDisputes, setSubmittedDisputes] = useState({});
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    Promise.all([
      attemptService.getCandidateResultDetail(attemptId),
      attemptService.getAttemptDisputes(attemptId).catch(() => ({ data: { disputes: [] } })),
    ])
      .then(([res, dispRes]) => {
        const d = res.data || {};
        if (d.result) {
          setResult(d.result);
        } else if (d.attempt) {
          const att = d.attempt;
          setResult({
            attemptId: att.id,
            examTitle: d.exam?.title,
            totalScore: att.scores?.total ?? 0,
            maxScore: d.exam?.totalMarks ?? 1,
            paper: (att.snapshot?.questions || []).map((q) => ({
              questionId: q.id,
              type: q.type,
              text: q.text,
              marks: q.marks,
              optionOrder: (q.options || []).map((o) => ({ optionId: o.id, text: o.text })),
              topic: q.topic,
            })),
            answers: Object.entries(att.answers || {}).map(([qid, a]) => ({
              questionId: qid,
              selectedOptionIds: Array.isArray(a.value) ? a.value : a.value ? [a.value] : [],
              text: typeof a.value === 'string' ? a.value : '',
            })),
            grades: Object.entries(att.scores?.perQuestion || {}).map(([qid, score]) => ({
              questionId: qid,
              finalScore: score,
            })),
            verificationId: att.verificationId,
          });
        }
        const dispMap = {};
        (dispRes.data?.disputes || []).forEach((disp) => {
          dispMap[disp.questionId] = disp;
        });
        setSubmittedDisputes(dispMap);
      })
      .catch((err) => toast.error(err.message || 'Unable to load result detail'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return <div className="p-12 text-center font-mono text-sm text-ink-muted">Loading transcript...</div>;
  }

  if (!result) {
    return <div className="p-12 text-center text-sm text-status-danger">Transcript unavailable.</div>;
  }

  const questions = result.paper || [];
  const score = result.totalScore ?? 0;
  const totalMarks = result.maxScore || 1;
  const pct = Math.min(100, Math.max(0, Math.round(result.percentage ?? (score / totalMarks) * 100)));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const handleDownloadPdf = async () => {
    if (USE_MOCK) {
      window.print();
      return;
    }
    try {
      await attemptService.downloadAttemptReportPdf(attemptId);
      toast.success('Transcript PDF downloaded');
    } catch (err) {
      toast.error(err.message || 'Unable to download PDF');
    }
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
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] text-ink">{result.examTitle}</h1>
            <p className="text-sm font-mono text-ink-muted mt-1">
              Total Score: <strong className="text-ink">{score}</strong> / {totalMarks}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.verificationId && (
            <>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(result.verificationId);
                  toast.success('Verification ID copied');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-line rounded-lg bg-canvas hover:bg-subtle"
              >
                <Copy className="w-3.5 h-3.5" /> Copy ID
              </button>
              <Link
                to={`/verify/${result.verificationId}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-line rounded-lg bg-canvas hover:bg-subtle"
              >
                <ShieldCheck className="w-4 h-4 text-status-answered" />
                {result.verificationId}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </>
          )}
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-cobalt text-white rounded-lg active:scale-[0.97]"
          >
            <Printer className="w-4 h-4" />
            Download PDF Report
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const qid = q.questionId || q.id;
          const gradeObj = (result.grades || []).find((g) => g.questionId === qid);
          const ansObj = (result.answers || []).find((a) => a.questionId === qid);
          const awarded = gradeObj?.finalScore ?? 0;

          let responseDisplay = '(Unanswered)';
          if (q.type === 'written') {
            responseDisplay = ansObj?.text || '(Unanswered)';
          } else if (ansObj?.selectedOptionIds?.length) {
            const labels = ansObj.selectedOptionIds.map(
              (oid) => q.optionOrder?.find((o) => o.optionId === oid)?.text || oid
            );
            responseDisplay = labels.join(', ');
          }

          return (
            <div key={qid} className="bg-surface border border-line rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className="text-xs font-mono text-ink-muted">
                  Question {idx + 1} · {q.topic}
                </span>
                <span className="text-xs font-mono font-semibold text-ink">
                  {awarded} / {q.marks} marks
                </span>
              </div>
              <p className="text-sm font-medium text-ink mb-2">{q.text}</p>
              <div className="text-xs font-mono text-ink-muted bg-canvas p-3 rounded border border-line">
                Your response: <span className="text-ink">{responseDisplay}</span>
              </div>
              {gradeObj?.feedback && (
                <p className="mt-2 text-xs font-mono text-ink-muted">Feedback: {gradeObj.feedback}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                {submittedDisputes[qid] ? (
                  <span className="text-xs font-mono text-cobalt">
                    Dispute status: <strong>{submittedDisputes[qid].status}</strong>
                    {submittedDisputes[qid].resolutionNote ? ` — ${submittedDisputes[qid].resolutionNote}` : ''}
                  </span>
                ) : (
                  <button
                    onClick={() => setDisputeQ(q)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-cobalt"
                  >
                    <Flag className="w-3.5 h-3.5" /> Raise a concern
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(disputeQ)} onClose={() => setDisputeQ(null)} title="Raise a Concern">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!explanation.trim() || submittingDispute) return;
            setSubmittingDispute(true);
            const qid = disputeQ.questionId || disputeQ.id;
            const reason = `[${category}] ${explanation.trim()}`.slice(0, 1000);
            try {
              const res = await attemptService.createDispute(attemptId, {
                questionId: qid,
                reason,
              });
              setSubmittedDisputes((prev) => ({ ...prev, [qid]: res.data.dispute }));
              setDisputeQ(null);
              setExplanation('');
              toast.success('Concern submitted for examiner review');
            } catch (err) {
              toast.error(err.message);
            } finally {
              setSubmittingDispute(false);
            }
          }}
          className="space-y-4"
        >
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="grading_error">Grading Error</option>
            <option value="ambiguous_question">Ambiguous Question</option>
            <option value="technical_incident">Technical Incident</option>
          </Select>
          <Textarea
            label="Explanation (min 5, max 1,000 chars)"
            required
            minLength={5}
            maxLength={960}
            rows={4}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Describe the grading or technical concern clearly..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDisputeQ(null)}>Cancel</Button>
            <Button type="submit" loading={submittingDispute}>Submit Concern</Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
};
