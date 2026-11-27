import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { examService } from '../../services/examService';
import { Button, Badge, Select, Textarea, CopyButton, SlideOverDrawer, DrawerSection } from '../../components/ui';
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
        const rawResult = res.data?.result || (res.data?.attempt
          ? {
              attemptId: res.data.attempt.id,
              examId: res.data.attempt.examId,
              examTitle: res.data.exam?.title,
              totalScore: res.data.attempt.scores?.total ?? 0,
              maxScore: res.data.exam?.totalMarks ?? 1,
              verificationId: res.data.attempt.verificationId,
              paper: res.data.attempt.snapshot?.questions || [],
              answers: res.data.attempt.answers || {},
              grades: res.data.attempt.scores?.perQuestion || {},
            }
          : null);
        setData(rawResult ? { ...res.data, result: rawResult } : null);
        const dispRes = await attemptService.getAttemptDisputes(attemptId).catch(() => null);
        const map = {};
        (dispRes?.data?.disputes || []).forEach((d) => {
          map[String(d.questionId)] = d;
        });
        setSubmittedDisputes(map);
      })
      .catch((err) => toast.error(err.message || 'Unable to load result detail'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return <div className="p-12 text-center font-mono text-sm text-ink-muted">Loading transcript...</div>;
  }

  const result = data?.result;
  if (!result) {
    return <div className="p-12 text-center text-sm text-status-danger">Transcript unavailable.</div>;
  }

  const questions = result.paper || [];
  const score = result.totalScore ?? 0;
  const totalMarks = Math.max(1, result.maxScore ?? 1);
  const pct =
    typeof result.percentage === 'number'
      ? Math.min(100, Math.max(0, Math.round(result.percentage)))
      : Math.min(100, Math.max(0, Math.round((score / totalMarks) * 100)));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const ansMap = new Map();
  if (Array.isArray(result.answers)) {
    result.answers.forEach((a) => ansMap.set(String(a.questionId), a));
  } else if (result.answers && typeof result.answers === 'object') {
    Object.entries(result.answers).forEach(([qid, val]) => ansMap.set(String(qid), val));
  }

  const gradeMap = new Map();
  if (Array.isArray(result.grades)) {
    result.grades.forEach((g) => gradeMap.set(String(g.questionId), g));
  } else if (result.grades && typeof result.grades === 'object') {
    Object.entries(result.grades).forEach(([qid, val]) =>
      gradeMap.set(String(qid), { finalScore: val })
    );
  }

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
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] text-ink">{result.examTitle}</h1>
            <p className="text-sm font-mono text-ink-muted mt-1">
              Total Score: <strong className="text-ink">{score}</strong> / {totalMarks}
            </p>
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {result.verificationId && (
            <>
              <CopyButton
                value={result.verificationId}
                toastMessage="Verification ID copied"
                className="px-3 py-2 text-xs font-mono border border-line rounded-lg bg-canvas hover:bg-subtle"
              >
                <span>Copy ID</span>
              </CopyButton>
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
          const qid = String(q.questionId || q.id);
          const gradeObj = gradeMap.get(qid);
          const ansObj = ansMap.get(qid);
          const awarded = gradeObj?.finalScore ?? gradeObj?.autoScore ?? 0;
          const optList = q.optionOrder || q.options || [];
          const findOptText = (oid) =>
            optList.find((o) => String(o.optionId || o.id) === String(oid))?.text || oid;
          const formattedAns = ansObj?.text
            ? ansObj.text
            : Array.isArray(ansObj?.selectedOptionIds) && ansObj.selectedOptionIds.length
            ? ansObj.selectedOptionIds.map(findOptText).join(', ')
            : Array.isArray(ansObj?.value)
            ? ansObj.value.map(findOptText).join(', ') || '(No selection)'
            : ansObj?.value
            ? findOptText(ansObj.value)
            : '(Unanswered)';
          const isLate = Boolean(ansObj?.lateSynced || ansObj?.isLateSynced);
          const disp = submittedDisputes[qid];

          return (
            <div key={qid} className="bg-surface border border-line rounded-lg p-5">
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
                Your response: <span className="text-ink">{formattedAns}</span>
              </div>
              {gradeObj?.feedback && (
                <div className="mt-2 text-xs font-mono text-ink-muted">
                  Examiner feedback: <span className="text-ink">{gradeObj.feedback}</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                {disp ? (() => {
                  const isUpheld = disp.status === 'resolved' || disp.status === 'accepted';
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
                  <Button variant="secondary" size="sm" onClick={() => setDisputeQ({ ...q, id: qid })}>
                    <Flag className="w-3.5 h-3.5" /> Challenge Answer
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SlideOverDrawer
        open={Boolean(disputeQ)}
        onClose={() => setDisputeQ(null)}
        eyebrow="Academic Transcript"
        title="Challenge Answer"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!explanation.trim() || submittingDispute) return;
            setSubmittingDispute(true);
            try {
              const qid = disputeQ.questionId || disputeQ.id;
              const res = await attemptService.createDispute(attemptId, {
                questionId: qid,
                reason: `[${category}] ${explanation.trim()}`.slice(0, 1000),
              });
              setSubmittedDisputes((prev) => ({ ...prev, [qid]: res.data.dispute }));
              setDisputeQ(null);
              setExplanation('');
              toast.success('Challenge submitted for professor review');
            } catch (err) {
              toast.error(err.message);
            } finally {
              setSubmittingDispute(false);
            }
          }}
          className="flex-1 flex flex-col justify-between gap-5"
        >
          <div className="space-y-4">
            <DrawerSection index={0}>
              <Select label="Reason" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="grading_error">Grading Discrepancy</option>
                <option value="ambiguous_question">Ambiguous Question</option>
                <option value="technical_incident">Technical / Sync Issue</option>
              </Select>
            </DrawerSection>
            <DrawerSection index={1}>
              <Textarea
                label="Justification (max 1,000 chars)"
                required
                maxLength={1000}
                rows={4}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Describe the grading discrepancy or technical issue clearly..."
              />
            </DrawerSection>
          </div>
          <DrawerSection index={2} className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
            <Button type="button" variant="secondary" onClick={() => setDisputeQ(null)}>Cancel</Button>
            <Button type="submit" loading={submittingDispute}>Submit Challenge</Button>
          </DrawerSection>
        </form>
      </SlideOverDrawer>

      <SlideOverDrawer
        open={Boolean(viewingResponse)}
        onClose={() => setViewingResponse(null)}
        eyebrow="Academic Transcript"
        title="Challenge Status & Professor Response"
      >
        {viewingResponse && (
          <div className="flex-1 flex flex-col justify-between gap-4 text-sm">
            <div className="space-y-4">
              <DrawerSection index={0} className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[var(--muted)]">Status</span>
                <Badge
                  tone={
                    viewingResponse.status === 'resolved' || viewingResponse.status === 'accepted'
                      ? 'success'
                      : viewingResponse.status === 'rejected'
                      ? 'neutral'
                      : 'warning'
                  }
                  dot={viewingResponse.status === 'rejected' ? 'slate' : undefined}
                >
                  {viewingResponse.status === 'resolved' || viewingResponse.status === 'accepted'
                    ? 'Upheld'
                    : viewingResponse.status === 'rejected'
                    ? 'Dismissed'
                    : 'Challenge Pending'}
                </Badge>
              </DrawerSection>
              <DrawerSection index={1} className="space-y-3">
                <div className="p-3.5 rounded-xl bg-canvas border border-[var(--line)]">
                  <div className="text-[11px] font-mono uppercase text-[var(--muted)] mb-1">Your Justification</div>
                  <p className="text-[var(--ink)]">{viewingResponse.reason || viewingResponse.explanation}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-canvas border border-[var(--line)]">
                  <div className="text-[11px] font-mono uppercase text-[var(--muted)] mb-1">Professor Response</div>
                  <p className="text-[var(--ink)]">
                    {viewingResponse.resolutionNote ||
                      (viewingResponse.status !== 'pending' && viewingResponse.explanation ? viewingResponse.reason : null) ||
                      'Your challenge is queued for examiner review.'}
                  </p>
                </div>
              </DrawerSection>
            </div>
            <DrawerSection index={2} className="flex justify-end pt-3 border-t border-[var(--line)]">
              <Button variant="secondary" onClick={() => setViewingResponse(null)}>
                Close
              </Button>
            </DrawerSection>
          </div>
        )}
      </SlideOverDrawer>
    </main>
  );
};
