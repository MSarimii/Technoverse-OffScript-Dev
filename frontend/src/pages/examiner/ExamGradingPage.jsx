import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Dialog, Skeleton, EmptyState } from '../../components/ui';
import { toast } from 'sonner';
import { Sparkles, CheckCircle2, Send, AlertTriangle } from 'lucide-react';

export const ExamGradingPage = () => {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('candidate'); // candidate | question
  const [draftScores, setDraftScores] = useState({});
  const [scoreErrors, setScoreErrors] = useState({});
  const [comments, setComments] = useState({});
  const [aiHints, setAiHints] = useState({});
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await examService.getGradingQueue(id);
      setExam(res.data?.exam);
      const list = res.data?.attempts || [];
      setAttempts(list);
      const init = {};
      list.forEach((a) => {
        init[a.id] = { ...(a.scores?.perQuestion || {}) };
      });
      setDraftScores(init);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleScoreChange = (attemptId, qid, rawVal, maxMarks) => {
    const val = Number(rawVal);
    if (Number.isNaN(val) || val < 0 || val > maxMarks) {
      setScoreErrors((prev) => ({
        ...prev,
        [`${attemptId}-${qid}`]: `Must be between 0 and ${maxMarks}`,
      }));
    } else {
      setScoreErrors((prev) => {
        const next = { ...prev };
        delete next[`${attemptId}-${qid}`];
        return next;
      });
    }
    setDraftScores((prev) => ({
      ...prev,
      [attemptId]: { ...(prev[attemptId] || {}), [qid]: rawVal === '' ? '' : val },
    }));
  };

  const handleSaveGrade = async (attemptId) => {
    const hasErr = Object.keys(scoreErrors).some((k) => k.startsWith(`${attemptId}-`));
    if (hasErr) {
      toast.error('Fix invalid mark entries before saving.');
      return;
    }
    try {
      await examService.gradeAttempt(attemptId, draftScores[attemptId] || {});
      toast.success('Grades saved and total recalculated');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAiSuggest = async (attemptId, q, answerText) => {
    try {
      const res = await examService.suggestGradeAI({
        questionText: q.text,
        rubric: q.rubric,
        answerText,
        maxMarks: q.marks,
      });
      const hint = res.data;
      setAiHints((prev) => ({ ...prev, [`${attemptId}-${q.id}`]: hint }));
      handleScoreChange(attemptId, q.id, hint.suggestedMarks, q.marks);
    } catch (err) {
      toast.error(err.message || 'AI suggestion unavailable');
    }
  };

  const handlePublishResults = async () => {
    try {
      await examService.publishResults(id);
      toast.success('Results published to candidates');
      setShowPublishConfirm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const writtenQuestions = attempts[0]?.snapshot?.questions?.filter((q) => q.type === 'written') || [];

  return (
    <main className="space-y-6">
      <PageHeader
        title="Evaluation & Grading"
        subtitle={exam?.title}
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Grading' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/examiner/challenges?examId=${id}`)}
            >
              View Challenges &amp; Integrity →
            </Button>
            <Button
              size="sm"
              variant={groupBy === 'candidate' ? 'primary' : 'secondary'}
              onClick={() => setGroupBy('candidate')}
            >
              By Candidate
            </Button>
            <Button
              size="sm"
              variant={groupBy === 'question' ? 'primary' : 'secondary'}
              onClick={() => setGroupBy('question')}
            >
              By Question
            </Button>
            <Button
              disabled={exam?.resultsPublished || attempts.length === 0}
              onClick={() => setShowPublishConfirm(true)}
            >
              <Send className="w-4 h-4" />
              {exam?.resultsPublished ? 'Results Published' : 'Publish Results'}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : attempts.length === 0 ? (
        <EmptyState title="No submitted attempts" description="Submitted attempts will appear here for evaluation." />
      ) : groupBy === 'candidate' ? (
        <div className="space-y-6">
          {attempts.map((a) => {
            const writtenQs = (a.snapshot?.questions || []).filter((q) => q.type === 'written');
            const total = Object.values(draftScores[a.id] || {}).reduce((s, v) => s + Number(v || 0), 0);

            return (
              <section key={a.id} className="bg-surface border border-line rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-ink">{a.candidateName}</h2>
                      <Badge tone={a.gradingState === 'graded' ? 'success' : 'warning'}>{a.gradingState}</Badge>
                    </div>
                    <span className="text-xs font-mono text-ink-muted">
                      Derived Total: <strong>{total.toFixed(2)}</strong> / {exam?.totalMarks}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => handleSaveGrade(a.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Save & Recalculate
                  </Button>
                </div>

                {writtenQs.length === 0 ? (
                  <p className="text-xs font-mono text-ink-muted">
                    All questions were objective and auto-graded deterministically.
                  </p>
                ) : (
                  writtenQs.map((q) => {
                    const ansText = a.answers?.[q.id]?.value || '(No written response)';
                    const hint = aiHints[`${a.id}-${q.id}`];
                    const errMsg = scoreErrors[`${a.id}-${q.id}`];
                    return (
                      <div key={q.id} className="p-4 rounded-lg bg-canvas border border-line space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ink">{q.text}</span>
                          <span className="text-xs font-mono text-ink-muted shrink-0">Max {q.marks}</span>
                        </div>
                        {q.rubric && (
                          <p className="text-[11px] font-mono text-ink-muted">Rubric: {q.rubric}</p>
                        )}
                        <p className="text-sm text-ink bg-surface p-3 rounded-lg border border-line">{ansText}</p>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-mono text-ink-muted">Marks:</label>
                            <input
                              type="number"
                              min={0}
                              max={q.marks}
                              step={0.5}
                              value={draftScores[a.id]?.[q.id] ?? 0}
                              onChange={(e) => handleScoreChange(a.id, q.id, e.target.value, q.marks)}
                              className={`w-20 px-2 py-1 text-sm font-mono bg-surface border rounded-lg ${errMsg ? 'border-status-danger' : 'border-line'}`}
                            />
                            {errMsg && <span className="text-xs text-status-danger">{errMsg}</span>}
                          </div>
                          <input
                            type="text"
                            placeholder="Optional feedback..."
                            value={comments[`${a.id}-${q.id}`] || ''}
                            onChange={(e) => setComments((c) => ({ ...c, [`${a.id}-${q.id}`]: e.target.value }))}
                            className="flex-1 min-w-[160px] px-2.5 py-1 text-xs bg-surface border border-line rounded-lg"
                          />
                          <Button size="sm" variant="secondary" onClick={() => handleAiSuggest(a.id, q, ansText)}>
                            <Sparkles className="w-3.5 h-3.5 text-cobalt" /> AI Suggest (Examiner Decides)
                          </Button>
                        </div>
                        {hint && (
                          <p className="text-[11px] font-mono text-cobalt">
                            AI Suggestion ({hint.suggestedMarks}/{q.marks}): {hint.rationale}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {writtenQuestions.length === 0 ? (
            <EmptyState title="No written questions" description="Switch to By Candidate view to inspect objective totals." />
          ) : (
            writtenQuestions.map((q) => (
              <section key={q.id} className="bg-surface border border-line rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-semibold text-ink">{q.text} (Max {q.marks})</h2>
                {attempts.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-canvas border border-line flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono text-ink-muted mb-1">{a.candidateName}</div>
                      <p className="text-sm text-ink">{a.answers?.[q.id]?.value || '(No response)'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={q.marks}
                        step={0.5}
                        value={draftScores[a.id]?.[q.id] ?? 0}
                        onChange={(e) => handleScoreChange(a.id, q.id, e.target.value, q.marks)}
                        className="w-20 px-2 py-1 text-sm font-mono bg-surface border border-line rounded-lg"
                      />
                      <Button size="sm" onClick={() => handleSaveGrade(a.id)}>Save</Button>
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      )}

      {/* Controlled Publish Results Confirmation */}
      <Dialog open={showPublishConfirm} onClose={() => setShowPublishConfirm(false)} title="Publish Examination Results">
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 text-sm text-ink">
            <AlertTriangle className="w-5 h-5 text-status-review shrink-0 mt-0.5" />
            <p>
              Publishing results makes each candidate&apos;s own score, per-question breakdown, PDF report, and verification ID visible to that candidate only.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowPublishConfirm(false)}>Cancel</Button>
            <Button onClick={handlePublishResults}>Confirm Publish</Button>
          </div>
        </div>
      </Dialog>
    </main>
  );
};
