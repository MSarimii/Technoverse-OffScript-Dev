import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { questionService } from '../../services/questionService';
import { adminService } from '../../services/adminService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Input, Textarea, Checkbox, Dialog, Badge } from '../../components/ui';
import { toast } from 'sonner';
import { Check, Scale, Send, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';

const DRAFT_KEY = 'sems_exam_wizard_draft_v1';

export const ExamWizardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [questionMode, setQuestionMode] = useState('pick'); // pick | blueprint
  const [questions, setQuestions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [qSearch, setQSearch] = useState('');
  const [candSearch, setCandSearch] = useState('');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [exam, setExam] = useState(() => {
    if (!isEdit) {
      try {
        const cached = localStorage.getItem(DRAFT_KEY);
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return {
      title: '',
      instructions: '',
      startAt: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
      endAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 16),
      durationMin: 45,
      totalMarks: 10,
      settings: {
        shuffleQuestions: true,
        shuffleOptions: true,
        balancedRandomization: true,
        showResultsPolicy: 'after_publish',
        blueprint: [{ topic: 'DSA', difficulty: 1, count: 1 }],
      },
      questionRefs: [],
      enrolledCandidateIds: [],
    };
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

  // Autosave draft locally for new exams
  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(exam));
    }
  }, [exam, isEdit]);

  const startMs = Date.parse(exam.startAt);
  const endMs = Date.parse(exam.endAt);
  const windowMinutes = (endMs - startMs) / 60000;
  const windowValid = !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs;
  const durationFits = windowValid && exam.durationMin > 0 && exam.durationMin <= windowMinutes;

  const selectedMarksSum = exam.questionRefs.reduce((s, r) => s + Number(r.marks || 0), 0);
  const marksMatch = Number(exam.totalMarks) === selectedMarksSum;

  const getPoolCount = (topic, diff) =>
    questions.filter((q) => q.topic === topic && Number(q.difficulty) === Number(diff)).length;

  const blueprintValid =
    !exam.settings?.balancedRandomization ||
    (exam.settings?.blueprint || []).every((b) => getPoolCount(b.topic, b.difficulty) >= Number(b.count));

  const canPublish = Boolean(exam.title.trim()) && windowValid && durationFits && exam.questionRefs.length > 0 && marksMatch && blueprintValid;

  const toggleQuestion = (q) => {
    const exists = exam.questionRefs.some((r) => r.questionId === q.id);
    const nextRefs = exists
      ? exam.questionRefs.filter((r) => r.questionId !== q.id)
      : [...exam.questionRefs, { questionId: q.id, marks: q.marks }];
    setExam({ ...exam, questionRefs: nextRefs });
  };

  const moveSelectedQuestion = (idx, dir) => {
    const next = [...exam.questionRefs];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setExam({ ...exam, questionRefs: next });
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(candSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(candSearch.toLowerCase())
  );

  const handleSave = async (publishNow = false) => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...exam,
        totalMarks: Number(exam.totalMarks),
        startAt: new Date(exam.startAt).toISOString(),
        endAt: new Date(exam.endAt).toISOString(),
      };
      const res = isEdit ? await examService.updateExam(id, payload) : await examService.createExam(payload);
      const savedId = res.data?.exam?.id || id;
      if (publishNow && savedId) {
        await examService.publishExam(savedId);
        toast.success('Examination published');
      } else {
        toast.success('Draft saved');
      }
      if (!isEdit) localStorage.removeItem(DRAFT_KEY);
      navigate('/examiner');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
      setShowPublishConfirm(false);
    }
  };

  const topics = Array.from(new Set(questions.map((q) => q.topic).filter(Boolean)));

  return (
    <main className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        title={isEdit ? 'Configure Examination' : 'New Examination Wizard'}
        subtitle="Draft changes are autosaved locally as you build."
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Exam Wizard' }]}
      />

      {/* 5-Step Stepper */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3 text-xs font-mono">
        {['1. Details', '2. Questions', '3. Candidates', '4. Review', '5. Publish'].map((label, idx) => (
          <button
            key={label}
            onClick={() => setStep(idx + 1)}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg ${
              step === idx + 1 ? 'bg-cobalt text-white' : 'bg-surface border border-line text-ink-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-5">
        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="Examination Title"
              value={exam.title}
              onChange={(e) => setExam({ ...exam, title: e.target.value })}
              placeholder="CS-402: Distributed Systems Midterm"
              error={!exam.title.trim() ? 'Title is required before publishing.' : ''}
            />
            <Textarea
              label="Candidate Instructions (paragraphs & lists)"
              rows={3}
              value={exam.instructions}
              onChange={(e) => setExam({ ...exam, instructions: e.target.value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                label="Start Window"
                type="datetime-local"
                value={exam.startAt}
                onChange={(e) => setExam({ ...exam, startAt: e.target.value })}
              />
              <Input
                label="End Window"
                type="datetime-local"
                value={exam.endAt}
                onChange={(e) => setExam({ ...exam, endAt: e.target.value })}
                error={!windowValid ? 'End must be after start.' : ''}
              />
              <Input
                label="Duration (min)"
                type="number"
                min={5}
                value={exam.durationMin}
                onChange={(e) => setExam({ ...exam, durationMin: Number(e.target.value) })}
                error={!durationFits ? 'Duration exceeds window.' : ''}
              />
              <Input
                label="Target Total Marks"
                type="number"
                min={1}
                value={exam.totalMarks}
                onChange={(e) => setExam({ ...exam, totalMarks: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <Checkbox
                label="Shuffle question order"
                checked={exam.settings?.shuffleQuestions}
                onChange={(e) => setExam({ ...exam, settings: { ...exam.settings, shuffleQuestions: e.target.checked } })}
              />
              <Checkbox
                label="Shuffle option order"
                checked={exam.settings?.shuffleOptions}
                onChange={(e) => setExam({ ...exam, settings: { ...exam.settings, shuffleOptions: e.target.checked } })}
              />
              <Checkbox
                label="5.2 Balanced Randomization (equal difficulty mix per paper)"
                checked={exam.settings?.balancedRandomization}
                onChange={(e) => setExam({ ...exam, settings: { ...exam.settings, balancedRandomization: e.target.checked } })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button size="sm" variant={questionMode === 'pick' ? 'primary' : 'secondary'} onClick={() => setQuestionMode('pick')}>
                  Pick from Bank
                </Button>
                <Button size="sm" variant={questionMode === 'blueprint' ? 'primary' : 'secondary'} onClick={() => setQuestionMode('blueprint')}>
                  <Scale className="w-3.5 h-3.5" /> Blueprint Matrix
                </Button>
              </div>
              <Badge tone={marksMatch ? 'success' : 'warning'}>
                Selected: {selectedMarksSum} / Target: {exam.totalMarks} marks
              </Badge>
            </div>

            {questionMode === 'pick' ? (
              <div className="space-y-3">
                <input
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  placeholder="Filter bank by text or topic..."
                  className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-lg"
                />
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {questions
                    .filter((q) => !qSearch || q.text.toLowerCase().includes(qSearch.toLowerCase()) || q.topic.toLowerCase().includes(qSearch.toLowerCase()))
                    .map((q) => {
                      const checked = exam.questionRefs.some((r) => r.questionId === q.id);
                      return (
                        <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${checked ? 'bg-navy-50 border-cobalt' : 'bg-canvas border-line'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleQuestion(q)} className="mt-1 accent-[#2F5BFF]" />
                          <div className="text-sm">
                            <span className="font-mono text-xs text-ink-muted block">{q.topic} · {q.type} · Diff {q.difficulty} · {q.marks}m</span>
                            <span className="text-ink">{q.text}</span>
                          </div>
                        </label>
                      );
                    })}
                </div>
                {exam.questionRefs.length > 0 && (
                  <div className="pt-3 border-t border-line space-y-1.5">
                    <div className="text-xs font-mono text-ink-muted">Selected Order (keyboard Move Up/Down)</div>
                    {exam.questionRefs.map((ref, idx) => {
                      const q = questions.find((item) => item.id === ref.questionId);
                      return (
                        <div key={ref.questionId} className="flex items-center justify-between px-3 py-1.5 rounded bg-canvas border border-line text-xs">
                          <span className="truncate">{idx + 1}. {q?.text || ref.questionId}</span>
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => moveSelectedQuestion(idx, -1)} aria-label="Move question up" className="p-1"><ArrowUp className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => moveSelectedQuestion(idx, 1)} aria-label="Move question down" className="p-1"><ArrowDown className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {(exam.settings?.blueprint || []).map((row, idx) => {
                  const pool = getPoolCount(row.topic, row.difficulty);
                  const tooSmall = pool < Number(row.count);
                  return (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-3 rounded-lg bg-canvas border border-line">
                      <select
                        value={row.topic}
                        onChange={(e) => {
                          const next = [...exam.settings.blueprint];
                          next[idx] = { ...row, topic: e.target.value };
                          setExam({ ...exam, settings: { ...exam.settings, blueprint: next } });
                        }}
                        className="px-2 py-1.5 text-xs bg-surface border border-line rounded"
                      >
                        {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select
                        value={row.difficulty}
                        onChange={(e) => {
                          const next = [...exam.settings.blueprint];
                          next[idx] = { ...row, difficulty: Number(e.target.value) };
                          setExam({ ...exam, settings: { ...exam.settings, blueprint: next } });
                        }}
                        className="px-2 py-1.5 text-xs bg-surface border border-line rounded"
                      >
                        <option value={1}>Difficulty 1</option>
                        <option value={2}>Difficulty 2</option>
                        <option value={3}>Difficulty 3</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={row.count}
                        onChange={(e) => {
                          const next = [...exam.settings.blueprint];
                          next[idx] = { ...row, count: Number(e.target.value) };
                          setExam({ ...exam, settings: { ...exam.settings, blueprint: next } });
                        }}
                        className="px-2 py-1.5 text-xs bg-surface border border-line rounded"
                      />
                      <span className={`text-xs font-mono ${tooSmall ? 'text-status-danger' : 'text-status-answered'}`}>
                        Pool: {pool} {tooSmall ? '(Too small!)' : 'OK'}
                      </span>
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setExam({
                      ...exam,
                      settings: {
                        ...exam.settings,
                        blueprint: [...(exam.settings?.blueprint || []), { topic: topics[0] || 'DSA', difficulty: 2, count: 1 }],
                      },
                    })
                  }
                >
                  + Add Blueprint Rule
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                value={candSearch}
                onChange={(e) => setCandSearch(e.target.value)}
                placeholder="Search candidates..."
                className="px-3 py-2 text-sm bg-canvas border border-line rounded-lg flex-1 min-w-[200px]"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setExam({
                    ...exam,
                    enrolledCandidateIds: Array.from(new Set([...exam.enrolledCandidateIds, ...filteredCandidates.map((c) => c.id)])),
                  })
                }
              >
                Select All Filtered ({filteredCandidates.length})
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredCandidates.map((c) => {
                const enrolled = exam.enrolledCandidateIds.includes(c.id);
                return (
                  <label key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-line bg-canvas cursor-pointer text-sm">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={enrolled}
                        onChange={() =>
                          setExam({
                            ...exam,
                            enrolledCandidateIds: enrolled
                              ? exam.enrolledCandidateIds.filter((x) => x !== c.id)
                              : [...exam.enrolledCandidateIds, c.id],
                          })
                        }
                        className="accent-[#2F5BFF]"
                      />
                      <span>{c.name}</span>
                    </span>
                    <span className="font-mono text-xs text-ink-muted">{c.email}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs font-mono text-ink-muted">Enrolled: {exam.enrolledCandidateIds.length} candidate(s)</p>
          </div>
        )}

        {(step === 4 || step === 5) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">Pre-Publication Checklist</h2>
            <ul className="space-y-2 text-xs font-mono">
              <li className={exam.title.trim() ? 'text-status-answered' : 'text-status-danger'}>
                {exam.title.trim() ? '✓' : '✗'} Title provided
              </li>
              <li className={windowValid && durationFits ? 'text-status-answered' : 'text-status-danger'}>
                {windowValid && durationFits ? '✓' : '✗'} Availability window & duration valid
              </li>
              <li className={exam.questionRefs.length > 0 && marksMatch ? 'text-status-answered' : 'text-status-danger'}>
                {exam.questionRefs.length > 0 && marksMatch ? '✓' : '✗'} Questions selected & marks match target ({selectedMarksSum}/{exam.totalMarks})
              </li>
              <li className={blueprintValid ? 'text-status-answered' : 'text-status-danger'}>
                {blueprintValid ? '✓' : '✗'} Blueprint pools sufficient
              </li>
            </ul>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="secondary" loading={saving} onClick={() => handleSave(false)}>
                <Check className="w-4 h-4" /> Save Draft
              </Button>
              <Button disabled={!canPublish} onClick={() => setShowPublishConfirm(true)}>
                <Send className="w-4 h-4" /> Publish Examination
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-line">
          <Button variant="secondary" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
            Previous
          </Button>
          {step < 5 && (
            <Button onClick={() => setStep((s) => Math.min(5, s + 1))}>Next Step</Button>
          )}
        </div>
      </div>

      <Dialog open={showPublishConfirm} onClose={() => setShowPublishConfirm(false)} title="Confirm Publication">
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 text-sm text-ink">
            <AlertTriangle className="w-5 h-5 text-status-review shrink-0 mt-0.5" />
            <p>
              Publishing <strong>{exam.title}</strong> makes it visible to enrolled candidates during the scheduled window and locks structural edits.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowPublishConfirm(false)}>Cancel</Button>
            <Button loading={saving} onClick={() => handleSave(true)}>Confirm & Publish</Button>
          </div>
        </div>
      </Dialog>
    </main>
  );
};
