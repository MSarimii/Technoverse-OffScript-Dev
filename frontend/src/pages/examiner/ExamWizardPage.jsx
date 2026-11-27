import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { questionService } from '../../services/questionService';
import { adminService } from '../../services/adminService';
import { toast } from 'sonner';
import { Check, Scale, Send } from 'lucide-react';

export const ExamWizardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [bulkEmails, setBulkEmails] = useState('candidate@sems.edu\nbilal@sems.edu');
  const [importErrors, setImportErrors] = useState([]);

  const [exam, setExam] = useState({
    title: '',
    instructions: '',
    startAt: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 16),
    durationMin: 45,
    settings: {
      shuffleQuestions: true,
      shuffleOptions: true,
      balancedRandomization: true,
      blueprint: [{ topic: 'Web Security', difficulty: 2, count: 1 }],
    },
    questionRefs: [],
    enrolledCandidateIds: [],
  });

  useEffect(() => {
    Promise.all([questionService.getQuestions(), adminService.getUsers().catch(() => ({ data: { users: [] } }))]).then(
      ([qRes, uRes]) => {
        setQuestions(qRes.data?.questions || []);
        setCandidates((uRes.data?.users || []).filter((u) => u.role === 'candidate'));
      }
    );

    if (isEdit) {
      examService.getExamById(id).then((res) => {
        const ex = res.data?.exam;
        if (ex) {
          setExam({
            ...ex,
            startAt: new Date(ex.startAt).toISOString().slice(0, 16),
            endAt: new Date(ex.endAt).toISOString().slice(0, 16),
          });
        }
      });
    }
  }, [id, isEdit]);

  const toggleQuestion = (q) => {
    const exists = exam.questionRefs.some((r) => r.questionId === q.id);
    const nextRefs = exists
      ? exam.questionRefs.filter((r) => r.questionId !== q.id)
      : [...exam.questionRefs, { questionId: q.id, marks: q.marks }];
    setExam({ ...exam, questionRefs: nextRefs });
  };

  const toggleCandidate = (cid) => {
    const exists = exam.enrolledCandidateIds.includes(cid);
    const next = exists
      ? exam.enrolledCandidateIds.filter((x) => x !== cid)
      : [...exam.enrolledCandidateIds, cid];
    setExam({ ...exam, enrolledCandidateIds: next });
  };

  const totalMarks = exam.questionRefs.reduce((s, r) => s + Number(r.marks || 0), 0);

  const handleSave = async (publishNow = false) => {
    try {
      const payload = {
        ...exam,
        totalMarks,
        startAt: new Date(exam.startAt).toISOString(),
        endAt: new Date(exam.endAt).toISOString(),
      };
      const res = isEdit ? await examService.updateExam(id, payload) : await examService.createExam(payload);
      const savedId = res.data?.exam?.id || id;
      if (publishNow && savedId) {
        await examService.publishExam(savedId);
        toast.success('Examination saved and published');
      } else {
        toast.success('Examination saved as draft');
      }
      navigate('/examiner');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkEnroll = async () => {
    if (!isEdit) {
      toast.info('Save draft first to run server-side bulk email import, or select candidates below.');
      return;
    }
    const rows = bulkEmails
      .split('\n')
      .map((email) => ({ email: email.trim() }))
      .filter((r) => r.email);
    try {
      const res = await examService.importCandidates(id, rows);
      setImportErrors(res.data?.errors || []);
      toast.success(`Enrolled ${res.data?.enrolledCount || 0} candidate(s)`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-serif text-3xl text-ink mb-2">
        {isEdit ? 'Configure Examination' : 'New Examination Wizard'}
      </h1>
      <div className="flex gap-2 mb-6 border-b border-line pb-3 text-xs font-mono">
        {['1. Details', '2. Questions & Blueprint', '3. Enrollment', '4. Review & Publish'].map((label, idx) => (
          <button
            key={label}
            onClick={() => setStep(idx + 1)}
            className={`px-3 py-1.5 rounded ${
              step === idx + 1 ? 'bg-navy-900 text-white' : 'bg-surface border border-line text-ink-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-lg p-6 space-y-5">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Examination Title</label>
              <input
                value={exam.title}
                onChange={(e) => setExam({ ...exam, title: e.target.value })}
                placeholder="CS-402: Distributed Systems Midterm"
                className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Candidate Instructions</label>
              <textarea
                rows={3}
                value={exam.instructions}
                onChange={(e) => setExam({ ...exam, instructions: e.target.value })}
                className="w-full p-3 text-sm bg-canvas border border-line rounded-md"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Start Window</label>
                <input
                  type="datetime-local"
                  value={exam.startAt}
                  onChange={(e) => setExam({ ...exam, startAt: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">End Window</label>
                <input
                  type="datetime-local"
                  value={exam.endAt}
                  onChange={(e) => setExam({ ...exam, endAt: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={exam.durationMin}
                  onChange={(e) => setExam({ ...exam, durationMin: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-md bg-navy-50 border border-navy-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-navy-900">
                <Scale className="w-4 h-4" />
                <span>
                  <strong>5.2 Balanced Randomization</strong>: Preserve difficulty mix across randomized papers
                </span>
              </div>
              <input
                type="checkbox"
                checked={exam.settings?.balancedRandomization}
                onChange={(e) =>
                  setExam({
                    ...exam,
                    settings: { ...exam.settings, balancedRandomization: e.target.checked },
                  })
                }
              />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {questions.map((q) => {
                const checked = exam.questionRefs.some((r) => r.questionId === q.id);
                return (
                  <label
                    key={q.id}
                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer ${
                      checked ? 'bg-navy-50 border-navy-800' : 'bg-canvas border-line'
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleQuestion(q)} className="mt-1" />
                    <div className="text-sm">
                      <span className="font-mono text-xs text-ink-muted block">
                        {q.topic} · {q.type} · Diff {q.difficulty} · {q.marks} marks
                      </span>
                      <span className="text-ink">{q.text}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xs font-mono uppercase text-ink-muted">Select Enrolled Candidates</h2>
              {candidates.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-2.5 rounded border border-line bg-canvas cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={exam.enrolledCandidateIds.includes(c.id)}
                    onChange={() => toggleCandidate(c.id)}
                  />
                  <span>{c.name}</span>
                  <span className="font-mono text-xs text-ink-muted">{c.email}</span>
                </label>
              ))}
            </div>

            <div className="pt-3 border-t border-line space-y-2">
              <label className="block text-xs font-semibold">Bulk Candidate Import (one email per line)</label>
              <textarea
                rows={3}
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                className="w-full p-2.5 font-mono text-xs bg-canvas border border-line rounded-md"
              />
              {importErrors.length > 0 && (
                <div className="text-xs font-mono text-status-danger">
                  {importErrors.map((e, i) => (
                    <div key={i}>Row {e.row} ({e.email}): {e.message}</div>
                  ))}
                </div>
              )}
              <button onClick={handleBulkEnroll} className="px-3 py-1.5 text-xs font-medium border border-line rounded-md bg-canvas">
                Run Bulk Import
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">Pre-Publication Review</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm bg-canvas p-4 rounded-md border border-line">
              <div>
                <dt className="text-xs text-ink-muted">Title</dt>
                <dd className="font-medium">{exam.title || '(Untitled)'}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Duration & Total Marks</dt>
                <dd className="font-mono">{exam.durationMin} min · {totalMarks} marks</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Assigned Questions</dt>
                <dd className="font-mono">{exam.questionRefs.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Enrolled Candidates</dt>
                <dd className="font-mono">{exam.enrolledCandidateIds.length}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleSave(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-line rounded-md bg-canvas"
              >
                <Check className="w-4 h-4" /> Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-navy-900 text-white rounded-md"
              >
                <Send className="w-4 h-4" /> Save & Publish
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-line">
          <button
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 text-sm border border-line rounded-md disabled:opacity-40"
          >
            Previous
          </button>
          {step < 4 && (
            <button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="px-4 py-2 text-sm font-semibold bg-navy-900 text-white rounded-md"
            >
              Next Step
            </button>
          )}
        </div>
      </div>
    </main>
  );
};
