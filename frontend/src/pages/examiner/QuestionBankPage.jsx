import { useEffect, useState, useRef } from 'react';
import { questionService } from '../../services/questionService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Input, Textarea, Select, Badge, Dialog, Skeleton, EmptyState, ErrorState, Tooltip } from '../../components/ui';
import { toast } from 'sonner';
import { validateImportFile, parseCsvSafe } from '../../lib/csv';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { Plus, Upload, Trash2, Copy, Edit3, ArrowUp, ArrowDown, BookOpen } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

gsap.registerPlugin(Flip);

const PAGE_SIZE = 10;

const emptyForm = {
  id: null,
  type: 'mcq_single',
  topic: 'DSA',
  difficulty: 2,
  text: '',
  marks: 2,
  negativeMarks: 0,
  multiSelectRule: 'all_or_nothing',
  rubric: '',
  options: [
    { id: 'opt-1', text: '', isCorrect: true },
    { id: 'opt-2', text: '', isCorrect: false },
  ],
};

export const QuestionBankPage = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const [showImport, setShowImport] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const reduced = useReducedMotion();
  const [importText, setImportText] = useState(
    '[\n  { "type": "mcq_single", "topic": "Networks", "difficulty": 2, "text": "Which protocol provides reliable ordered byte-stream delivery?", "marks": 2 }\n]'
  );
  const [importErrors, setImportErrors] = useState([]);

  const listRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await questionService.getQuestions();
      setQuestions(res.data?.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const triggerFlip = (fn) => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches || !listRef.current) {
      fn();
      return;
    }
    const state = Flip.getState(listRef.current.children);
    fn();
    requestAnimationFrame(() => {
      Flip.from(state, { duration: 0.22, ease: 'power1.out', absolute: false });
    });
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setShowEditor(true);
  };

  const openEdit = (q) => {
    setForm({
      id: q.id,
      type: q.type,
      topic: q.topic || 'General',
      difficulty: q.difficulty || 2,
      text: q.text || '',
      marks: q.marks || 2,
      negativeMarks: q.negativeMarks || 0,
      multiSelectRule: q.multiSelectRule || 'all_or_nothing',
      rubric: q.rubric || '',
      options: q.options?.length ? structuredClone(q.options) : emptyForm.options,
    });
    setFormError('');
    setShowEditor(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.text.trim()) return setFormError('Question stem is required.');
    if (form.type !== 'written') {
      const validOpts = form.options.filter((o) => o.text.trim());
      if (validOpts.length < 2) return setFormError('Provide at least 2 non-empty options.');
      const correctCount = validOpts.filter((o) => o.isCorrect).length;
      if (form.type === 'mcq_single' && correctCount !== 1) {
        return setFormError('Single MCQ must have exactly 1 correct option.');
      }
      if (form.type === 'mcq_multi' && correctCount < 1) {
        return setFormError('Multi-select MCQ must have at least 1 correct option.');
      }
    }

    setSaving(true);
    try {
      const payload = {
        type: form.type,
        topic: form.topic.trim() || 'General',
        difficulty: Number(form.difficulty),
        text: form.text.trim(),
        marks: Number(form.marks),
        negativeMarks: Number(form.negativeMarks) || 0,
        multiSelectRule: form.multiSelectRule,
        rubric: form.rubric,
        options: form.type === 'written' ? [] : form.options.filter((o) => o.text.trim()),
      };
      if (form.id) {
        const res = await questionService.updateQuestion(form.id, payload);
        setQuestions((prev) => prev.map((q) => (q.id === form.id ? res.data.question : q)));
        toast.success('Question updated');
      } else {
        const res = await questionService.createQuestion(payload);
        setQuestions((prev) => [res.data.question, ...prev]);
        toast.success('Question created');
      }
      setShowEditor(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (q) => {
    try {
      const res = await questionService.createQuestion({
        ...q,
        id: undefined,
        text: `${q.text} (Copy)`,
      });
      setQuestions((prev) => [res.data.question, ...prev]);
      toast.success('Question duplicated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await questionService.deleteQuestion(id).catch(() => {});
    }
    setQuestions((prev) => prev.filter((q) => !selectedIds.includes(q.id)));
    setSelectedIds([]);
    toast.success('Selected questions deleted');
  };

  const handleImport = async () => {
    setImportErrors([]);
    try {
      const parsed = JSON.parse(importText);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const res = await questionService.importQuestions(rows);
      const { importedCount, errors } = res.data || {};
      setImportErrors(errors || []);
      toast.success(`Imported ${importedCount || 0} question(s)`);
      load();
    } catch (err) {
      toast.error(err.message || 'Invalid JSON format');
    }
  };

  const topics = Array.from(new Set(questions.map((q) => q.topic).filter(Boolean)));

  const filtered = questions
    .filter((q) => {
      const matchSearch = !search || q.text.toLowerCase().includes(search.toLowerCase());
      const matchTopic = topicFilter === 'all' || q.topic === topicFilter;
      const matchDiff = diffFilter === 'all' || String(q.difficulty) === diffFilter;
      const matchType = typeFilter === 'all' || q.type === typeFilter;
      return matchSearch && matchTopic && matchDiff && matchType;
    })
    .sort((a, b) => {
      if (sortBy === 'difficulty') return b.difficulty - a.difficulty;
      if (sortBy === 'marks') return b.marks - a.marks;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const moveOption = (idx, dir) => {
    const next = [...form.options];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setForm({ ...form, options: next });
  };

  return (
    <main className="space-y-5">
      <PageHeader
        title="Question Bank"
        subtitle={`${questions.length} reusable questions across topics and difficulty levels.`}
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Question Bank' }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowImport((v) => !v)}>
              <Upload className="w-4 h-4" /> Bulk Import
            </Button>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> New Question
            </Button>
          </>
        }
      />

      {showImport && (
        <div className="bg-surface border border-line rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Bulk Import Questions (CSV / JSON)</h2>
            <input
              type="file"
              accept=".csv,.json"
              aria-label="Choose CSV or JSON file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                const err = validateImportFile(file);
                if (err) return toast.error(err);
                const text = await file.text();
                if (file.name.toLowerCase().endsWith('.csv')) {
                  const parsed = parseCsvSafe(text);
                  if (parsed.error) return toast.error(parsed.error);
                  setImportText(JSON.stringify(parsed.rows, null, 2));
                } else {
                  setImportText(text);
                }
              }}
              className="text-xs font-mono"
            />
          </div>
          <textarea
            rows={4}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full p-3 font-mono text-xs bg-canvas border border-line rounded-lg"
          />
          {importErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-mono text-status-danger">
              {importErrors.map((e, i) => (
                <div key={i}>Row {e.row}: {e.message}</div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowImport(false)}>Close</Button>
            <Button size="sm" onClick={handleImport}>Validate & Import</Button>
          </div>
        </div>
      )}

      {/* Unified Question Bank Card & Inline Toolbar */}
      <div className="luxury-card rounded-2xl border-t-2 border-t-[#0B0F0E] overflow-hidden">
        <div className="p-4 border-b border-line bg-surface grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            value={search}
            onChange={(e) => triggerFlip(() => { setSearch(e.target.value); setPage(1); })}
            placeholder="Search question text..."
            aria-label="Search questions"
            className="px-3 py-2 min-h-[40px] text-sm bg-canvas border border-line rounded-lg"
          />
          <Select
            aria-label="Filter by topic"
            value={topicFilter}
            onChange={(e) => triggerFlip(() => { setTopicFilter(e.target.value); setPage(1); })}
          >
            <option value="all">All Topics</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select
            aria-label="Filter by difficulty"
            value={diffFilter}
            onChange={(e) => triggerFlip(() => { setDiffFilter(e.target.value); setPage(1); })}
          >
            <option value="all">All Difficulties</option>
            <option value="1">Difficulty 1</option>
            <option value="2">Difficulty 2</option>
            <option value="3">Difficulty 3</option>
          </Select>
          <Select
            aria-label="Filter by type"
            value={typeFilter}
            onChange={(e) => triggerFlip(() => { setTypeFilter(e.target.value); setPage(1); })}
          >
            <option value="all">All Types</option>
            <option value="mcq_single">Single MCQ</option>
            <option value="mcq_multi">Multi-Select</option>
            <option value="written">Written</option>
          </Select>
          <Select aria-label="Sort questions" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Sort: Default</option>
            <option value="difficulty">Sort: Difficulty</option>
            <option value="marks">Sort: Marks</option>
          </Select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-[#ECFDF5] border-b border-[#A7F3D0] px-4 py-2.5 text-xs font-mono text-[#065F46]">
            <span>{selectedIds.length} question(s) selected</span>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </Button>
          </div>
        )}

        <div className="p-4">

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No matching questions" description="Adjust filters or create a new question." />
      ) : (
        <>
          <div ref={listRef} className="space-y-3">
            {paged.map((q) => (
              <motion.div
                key={q.id}
                layout={!reduced}
                transition={{ layout: { type: 'spring', stiffness: 420, damping: 34 } }}
                data-flip-id={q.id}
                className="bg-surface border border-line rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Select question ${q.id}`}
                    checked={selectedIds.includes(q.id)}
                    onChange={(e) =>
                      setSelectedIds((prev) =>
                        e.target.checked ? [...prev, q.id] : prev.filter((x) => x !== q.id)
                      )
                    }
                    className="mt-1 accent-[#2F5BFF]"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ink-muted mb-1">
                      <Badge tone="neutral">
                        {q.type === 'mcq_single' ? 'Single Choice' : q.type === 'mcq_multi' ? 'Multi-Select' : 'Written'}
                      </Badge>
                      <span>{q.topic}</span>
                      <Badge tone={q.difficulty === 1 ? 'success' : q.difficulty === 2 ? 'warning' : 'danger'}>
                        {q.difficulty === 1 ? 'Easy' : q.difficulty === 2 ? 'Medium' : 'Hard'}
                      </Badge>
                      <span>{q.marks} marks</span>
                    </div>
                    <p className="text-sm font-medium text-ink">{q.text}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 relative">
                  <Tooltip label="Edit question">
                    <button
                      onClick={() => openEdit(q)}
                      aria-label="Edit question"
                      className="p-2 text-ink-muted hover:text-ink rounded-lg transition-transform active:scale-95"
                    >
                      <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Duplicate question">
                    <button
                      onClick={() => handleDuplicate(q)}
                      aria-label="Duplicate question"
                      className="p-2 text-ink-muted hover:text-ink rounded-lg transition-transform active:scale-95"
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Delete question">
                    <button
                      onClick={() => setConfirmDeleteId(confirmDeleteId === q.id ? null : q.id)}
                      aria-label="Delete question"
                      className="p-2 text-ink-muted hover:text-status-danger rounded-lg transition-transform active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </Tooltip>
                  <AnimatePresence>
                    {confirmDeleteId === q.id && (
                      <motion.div
                        initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.94, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                        style={{ transformOrigin: 'top right' }}
                        className="absolute right-0 top-10 z-30 w-56 p-3 rounded-[12px] luxury-card space-y-2"
                      >
                        <p className="text-xs text-ink font-medium">Are you sure?</p>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={async () => {
                              await questionService.deleteQuestion(q.id);
                              setQuestions((prev) => prev.filter((item) => item.id !== q.id));
                              setConfirmDeleteId(null);
                              toast.success('Question deleted');
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-ink-muted pt-2">
            <span>Page {safePage} of {totalPages} ({filtered.length} questions)</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button size="sm" variant="secondary" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
        </div>
      </div>

      {/* Create / Edit Question Dialog */}
      <Dialog
        open={showEditor}
        onClose={() => setShowEditor(false)}
        title={form.id ? 'Edit Question' : 'Create Question'}
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {formError && (
            <div role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-status-danger">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="mcq_single">Single MCQ</option>
              <option value="mcq_multi">Multi-Select MCQ</option>
              <option value="written">Written Response</option>
            </Select>
            <Input
              label="Topic (or create new)"
              list="sems-topics"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
            <datalist id="sems-topics">
              {topics.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div>
            <span className="block text-xs font-semibold text-ink mb-1">Difficulty</span>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, difficulty: d })}
                  className={`py-2 rounded-lg text-xs font-mono border ${
                    form.difficulty === d ? 'bg-cobalt text-white border-cobalt' : 'bg-canvas border-line'
                  }`}
                >
                  Level {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Marks"
              type="number"
              min={1}
              value={form.marks}
              onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })}
            />
            <Input
              label="Negative Marks"
              type="number"
              min={0}
              step={0.25}
              value={form.negativeMarks}
              onChange={(e) => setForm({ ...form, negativeMarks: Number(e.target.value) })}
            />
          </div>

          <Textarea
            label="Question Stem"
            rows={3}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />

          {form.type === 'mcq_multi' && (
            <Select
              label="Multi-Select Marking Rule (Partial = (correct - wrong) / totalCorrect)"
              value={form.multiSelectRule}
              onChange={(e) => setForm({ ...form, multiSelectRule: e.target.value })}
            >
              <option value="all_or_nothing">All or nothing</option>
              <option value="partial">Partial credit</option>
            </Select>
          )}

          {form.type !== 'written' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">Options</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      options: [...form.options, { id: `opt-${Date.now()}`, text: '', isCorrect: false }],
                    })
                  }
                  className="text-xs font-mono text-cobalt hover:underline"
                >
                  + Add option
                </button>
              </div>
              {form.options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type={form.type === 'mcq_single' ? 'radio' : 'checkbox'}
                    name="correct-opt"
                    checked={opt.isCorrect}
                    onChange={(e) => {
                      const next = form.options.map((o, i) =>
                        form.type === 'mcq_single'
                          ? { ...o, isCorrect: i === idx }
                          : i === idx
                          ? { ...o, isCorrect: e.target.checked }
                          : o
                      );
                      setForm({ ...form, options: next });
                    }}
                  />
                  <input
                    value={opt.text}
                    onChange={(e) => {
                      const next = form.options.map((o, i) => (i === idx ? { ...o, text: e.target.value } : o));
                      setForm({ ...form, options: next });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-canvas border border-line rounded-lg"
                  />
                  <button type="button" onClick={() => moveOption(idx, -1)} aria-label="Move up" className="p-1 text-ink-muted">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => moveOption(idx, 1)} aria-label="Move down" className="p-1 text-ink-muted">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, options: form.options.filter((_, i) => i !== idx) })}
                      aria-label="Remove option"
                      className="p-1 text-status-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Textarea
              label="Grading Rubric"
              rows={2}
              value={form.rubric}
              onChange={(e) => setForm({ ...form, rubric: e.target.value })}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Question</Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
};
