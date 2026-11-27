import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { examService } from '../../services/examService';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, CheckCircle2, Send } from 'lucide-react';

export const ExamGradingPage = () => {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draftScores, setDraftScores] = useState({});
  const [aiHints, setAiHints] = useState({});

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

  const handleScoreChange = (attemptId, qid, val, maxMarks) => {
    const num = Math.max(0, Math.min(maxMarks, Number(val) || 0));
    setDraftScores((prev) => ({
      ...prev,
      [attemptId]: { ...(prev[attemptId] || {}), [qid]: num },
    }));
  };

  const handleSaveGrade = async (attemptId) => {
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
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/examiner" className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-ink mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to console
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">Evaluation & Grading</h1>
          <p className="text-sm text-ink-muted">{exam?.title}</p>
        </div>
        <button
          onClick={handlePublishResults}
          disabled={exam?.resultsPublished}
          className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-md"
        >
          <Send className="w-4 h-4" />
          {exam?.resultsPublished ? 'Results Published' : 'Publish Results'}
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-ink-muted">Loading submissions...</p>
      ) : attempts.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-8 text-center text-sm text-ink-muted">
          No submitted attempts ready for grading.
        </div>
      ) : (
        <div className="space-y-6">
          {attempts.map((a) => {
            const writtenQs = (a.snapshot?.questions || []).filter((q) => q.type === 'written');
            const total = Object.values(draftScores[a.id] || {}).reduce((s, v) => s + Number(v || 0), 0);

            return (
              <section key={a.id} className="bg-surface border border-line rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h2 className="font-semibold text-ink">{a.candidateName}</h2>
                    <span className="text-xs font-mono text-ink-muted">
                      State: {a.gradingState} · Derived Total: <strong>{total.toFixed(2)}</strong> / {exam?.totalMarks}
                    </span>
                  </div>
                  <button
                    onClick={() => handleSaveGrade(a.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-navy-900 text-white rounded-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Save Grades
                  </button>
                </div>

                {writtenQs.length === 0 ? (
                  <p className="text-xs font-mono text-ink-muted">
                    All questions were objective and auto-graded deterministically.
                  </p>
                ) : (
                  writtenQs.map((q) => {
                    const ansText = a.answers?.[q.id]?.value || '(No written response)';
                    const hint = aiHints[`${a.id}-${q.id}`];
                    return (
                      <div key={q.id} className="p-4 rounded-md bg-canvas border border-line space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ink">{q.text}</span>
                          <span className="text-xs font-mono text-ink-muted shrink-0">Max {q.marks}</span>
                        </div>
                        <p className="text-sm text-ink bg-surface p-3 rounded border border-line">{ansText}</p>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-mono text-ink-muted">Award Marks:</label>
                            <input
                              type="number"
                              min={0}
                              max={q.marks}
                              step={0.5}
                              value={draftScores[a.id]?.[q.id] ?? 0}
                              onChange={(e) => handleScoreChange(a.id, q.id, e.target.value, q.marks)}
                              className="w-20 px-2 py-1 text-sm font-mono bg-surface border border-line rounded"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAiSuggest(a.id, q, ansText)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded border border-line bg-surface hover:bg-subtle"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-navy-800" />
                            AI Suggest (Examiner Decides)
                          </button>
                        </div>
                        {hint && (
                          <p className="text-[11px] font-mono text-navy-800">
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
      )}
    </main>
  );
};
