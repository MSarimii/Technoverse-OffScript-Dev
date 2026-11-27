import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Dialog, Skeleton, EmptyState } from '../../components/ui';
import { toast } from 'sonner';
import { Sparkles, CheckCircle2, Send, AlertTriangle, Download, RefreshCw } from 'lucide-react';

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
      const [exRes, subRes] = await Promise.all([
        examService.getExamById(id),
        examService.getGradingQueue(id),
      ]);
      setExam(exRes.data?.exam);
      const summaries = subRes.data?.submissions || subRes.data?.attempts || [];

      const details = await Promise.all(
        summaries.map(async (s) => {
          const aid = s.attemptId || s.id;
          if (s.paper && s.answers) return s;
          try {
            const dRes = await examService.getAttemptGrading(aid);
            return { ...s, ...(dRes.data?.attempt || {}) };
          } catch {
            return s;
          }
        })
      );

      setAttempts(details);
      const init = {};
      const initComments = {};
      details.forEach((a) => {
        const aid = a.attemptId || a.id;
        init[aid] = {};
        if (Array.isArray(a.grades)) {
          a.grades.forEach((g) => {
            init[aid][g.questionId] = g.manualScore ?? g.finalScore ?? 0;
            if (g.feedback) initComments[`${aid}-${g.questionId}`] = g.feedback;
          });
        } else if (a.scores?.perQuestion) {
          init[aid] = { ...a.scores.perQuestion };
        }
      });
      setDraftScores(init);
      setComments(initComments);
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

  const handleSaveGrade = async (attempt) => {
    const attemptId = attempt.attemptId || attempt.id;
    const hasErr = Object.keys(scoreErrors).some((k) => k.startsWith(`${attemptId}-`));
    if (hasErr) {
      toast.error('Fix invalid mark entries before saving.');
      return;
    }
    try {
      const writtenQs = (attempt.paper || attempt.snapshot?.questions || []).filter((q) => q.type === 'written');
      await Promise.all(
        writtenQs.map((q) => {
          const qid = q.questionId || q.id;
          return examService.gradeQuestion(attemptId, qid, {
            score: Number(draftScores[attemptId]?.[qid] ?? 0),
            feedback: comments[`${attemptId}-${qid}`] || '',
          });
        })
      );
      toast.success('Grades saved and total recalculated');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAiSuggest = async (attemptId, q, answerText) => {
    const qid = q.questionId || q.id;
    try {
      const res = await examService.suggestGradeAI({
        questionText: q.text,
        rubric: q.rubric,
        answerText,
        maxMarks: q.marks,
      });
      const hint = res.data;
      setAiHints((prev) => ({ ...prev, [`${attemptId}-${qid}`]: hint }));
      handleScoreChange(attemptId, qid, hint.suggestedMarks, q.marks);
    } catch (err) {
      toast.error(err.message || 'AI suggestion unavailable');
    }
  };

  const handlePublishResults = async () => {
    try {
      await examService.publishResults(id, { force: true });
      toast.success('Results published to candidates');
      setShowPublishConfirm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRegrade = async () => {
    try {
      const res = await examService.regradeExam(id);
      toast.success(`Regraded ${res.data?.regraded ?? 0} attempt(s)`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const firstPaper = attempts[0]?.paper || attempts[0]?.snapshot?.questions || [];
  const writtenQuestions = firstPaper.filter((q) => q.type === 'written');

  const getAnswerText = (attempt, qid) => {
    if (Array.isArray(attempt.answers)) {
      return attempt.answers.find((ans) => ans.questionId === qid)?.text || '';
    }
    return attempt.answers?.[qid]?.value || '';
  };

  return (
    <main className="space-y-6">
      <PageHeader
        title="Evaluation & Grading"
        subtitle={exam?.title}
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Grading' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={groupBy === 'candidate' ? 'primary' : 'secondary'} onClick={() => setGroupBy('candidate')}>
              By Candidate
            </Button>
            <Button size="sm" variant={groupBy === 'question' ? 'primary' : 'secondary'} onClick={() => setGroupBy('question')}>
              By Question
            </Button>
            <Button size="sm" variant="secondary" onClick={handleRegrade}>
              <RefreshCw className="w-3.5 h-3.5" /> Regrade Objective
            </Button>
            <Button size="sm" variant="secondary" onClick={() => examService.downloadResultsCsv(id).catch((e) => toast.error(e.message))}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button disabled={exam?.resultsPublished || attempts.length === 0} onClick={() => setShowPublishConfirm(true)}>
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
            const aid = a.attemptId || a.id;
            const paper = a.paper || a.snapshot?.questions || [];
            const writtenQs = paper.filter((q) => q.type === 'written');
            const total = Object.values(draftScores[aid] || {}).reduce((s, v) => s + Number(v || 0), 0);
            const gradingStatus = a.gradingStatus || a.gradingState || 'complete';

            return (
              <section key={aid} className="bg-surface border border-line rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-ink">{a.candidate?.name || a.candidateName || 'Candidate'}</h2>
                      <Badge tone={gradingStatus === 'complete' || gradingStatus === 'graded' ? 'success' : 'warning'}>
                        {gradingStatus}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-ink-muted">
                      Derived Total: <strong>{(total || a.totalScore || 0).toFixed(2)}</strong> / {a.maxScore ?? exam?.totalMarks}
                    </span>
                  </div>
                  {writtenQs.length > 0 && (
                    <Button size="sm" onClick={() => handleSaveGrade(a)}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Save & Recalculate
                    </Button>
                  )}
                </div>

                {writtenQs.length === 0 ? (
                  <p className="text-xs font-mono text-ink-muted">
                    All questions were objective and auto-graded deterministically.
                  </p>
                ) : (
                  writtenQs.map((q) => {
                    const qid = q.questionId || q.id;
                    const ansText = getAnswerText(a, qid) || '(No written response)';
                    const hint = aiHints[`${aid}-${qid}`];
                    const errMsg = scoreErrors[`${aid}-${qid}`];
                    return (
                      <div key={qid} className="p-4 rounded-lg bg-canvas border border-line space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ink">{q.text}</span>
                          <span className="text-xs font-mono text-ink-muted shrink-0">Max {q.marks}</span>
                        </div>
                        <p className="text-sm text-ink bg-surface p-3 rounded-lg border border-line">{ansText}</p>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-mono text-ink-muted">Marks:</label>
                            <input
                              type="number"
                              min={0}
                              max={q.marks}
                              step={0.5}
                              value={draftScores[aid]?.[qid] ?? 0}
                              onChange={(e) => handleScoreChange(aid, qid, e.target.value, q.marks)}
                              className={`w-20 px-2 py-1 text-sm font-mono bg-surface border rounded-lg ${errMsg ? 'border-status-danger' : 'border-line'}`}
                            />
                            {errMsg && <span className="text-xs text-status-danger">{errMsg}</span>}
                          </div>
                          <input
                            type="text"
                            placeholder="Optional feedback..."
                            value={comments[`${aid}-${qid}`] || ''}
                            onChange={(e) => setComments((c) => ({ ...c, [`${aid}-${qid}`]: e.target.value }))}
                            className="flex-1 min-w-[160px] px-2.5 py-1 text-xs bg-surface border border-line rounded-lg"
                          />
                          <Button size="sm" variant="secondary" onClick={() => handleAiSuggest(aid, q, ansText)}>
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
            writtenQuestions.map((q) => {
              const qid = q.questionId || q.id;
              return (
                <section key={qid} className="bg-surface border border-line rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-ink">{q.text} (Max {q.marks})</h2>
                  {attempts.map((a) => {
                    const aid = a.attemptId || a.id;
                    return (
                      <div key={aid} className="p-3 rounded-lg bg-canvas border border-line flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono text-ink-muted mb-1">{a.candidate?.name || a.candidateName}</div>
                          <p className="text-sm text-ink">{getAnswerText(a, qid) || '(No response)'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={q.marks}
                            step={0.5}
                            value={draftScores[aid]?.[qid] ?? 0}
                            onChange={(e) => handleScoreChange(aid, qid, e.target.value, q.marks)}
                            className="w-20 px-2 py-1 text-sm font-mono bg-surface border border-line rounded-lg"
                          />
                          <Button size="sm" onClick={() => handleSaveGrade(a)}>Save</Button>
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })
          )}
        </div>
      )}

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
