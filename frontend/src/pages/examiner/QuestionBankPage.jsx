import { useEffect, useState } from 'react';
import { questionService } from '../../services/questionService';
import { toast } from 'sonner';
import { Plus, Upload, Trash2 } from 'lucide-react';

export const QuestionBankPage = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topicFilter, setTopicFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState(
    '[\n  { "type": "mcq_single", "topic": "Security", "difficulty": 2, "text": "Sample imported question?", "marks": 2 }\n]'
  );
  const [importErrors, setImportErrors] = useState([]);

  const [form, setForm] = useState({
    type: 'mcq_single',
    topic: 'General',
    difficulty: 2,
    text: '',
    marks: 2,
    negativeMarks: 0,
    multiSelectRule: 'all_or_nothing',
    rubric: '',
    opt1: '',
    opt2: '',
    opt3: '',
    opt4: '',
    correctIdx: 0,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await questionService.getQuestions();
      setQuestions(res.data?.questions || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const options =
      form.type === 'written'
        ? []
        : [form.opt1, form.opt2, form.opt3, form.opt4]
            .filter(Boolean)
            .map((text, idx) => ({ id: `opt-${Date.now()}-${idx}`, text, isCorrect: idx === Number(form.correctIdx) }));

    try {
      const res = await questionService.createQuestion({
        type: form.type,
        topic: form.topic,
        difficulty: Number(form.difficulty),
        text: form.text,
        marks: Number(form.marks),
        negativeMarks: Number(form.negativeMarks),
        multiSelectRule: form.multiSelectRule,
        rubric: form.rubric,
        options,
      });
      setQuestions((prev) => [res.data.question, ...prev]);
      setShowCreate(false);
      toast.success('Question added to bank');
    } catch (err) {
      toast.error(err.message);
    }
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

  const handleDelete = async (id) => {
    try {
      await questionService.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success('Question deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = questions.filter((q) => {
    const matchTopic = !topicFilter || q.topic.toLowerCase().includes(topicFilter.toLowerCase());
    const matchType = typeFilter === 'all' || q.type === typeFilter;
    return matchTopic && matchType;
  });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">Question Bank</h1>
          <p className="text-sm text-ink-muted">Reusable objective and written questions with topics and difficulty levels.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-line rounded-md bg-surface hover:bg-subtle"
          >
            <Upload className="w-4 h-4" /> Bulk Import (4.4)
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-navy-900 text-white rounded-md active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> New Question
          </button>
        </div>
      </div>

      {showImport && (
        <div className="bg-surface border border-line rounded-lg p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink">Bulk Import Questions (JSON)</h2>
          <textarea
            rows={5}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full p-3 font-mono text-xs bg-canvas border border-line rounded-md"
          />
          {importErrors.length > 0 && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-xs font-mono text-status-danger space-y-1">
              {importErrors.map((e, i) => (
                <div key={i}>
                  Row {e.row}: {e.message}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowImport(false)} className="px-3 py-1.5 text-xs border border-line rounded-md">
              Close
            </button>
            <button onClick={handleImport} className="px-4 py-1.5 text-xs font-semibold bg-navy-900 text-white rounded-md">
              Validate & Import
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-surface border border-line rounded-lg p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
              >
                <option value="mcq_single">Single MCQ</option>
                <option value="mcq_multi">Multi-Select MCQ</option>
                <option value="written">Written Response</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Topic</label>
              <input
                required
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Difficulty (1-3)</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
              >
                <option value={1}>1 - Easy</option>
                <option value={2}>2 - Medium</option>
                <option value={3}>3 - Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Marks</label>
              <input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Question Prompt</label>
            <textarea
              required
              rows={2}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full p-2.5 text-sm bg-canvas border border-line rounded-md"
            />
          </div>

          {form.type !== 'written' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['opt1', 'opt2', 'opt3', 'opt4'].map((key, idx) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIdx"
                    checked={Number(form.correctIdx) === idx}
                    onChange={() => setForm({ ...form, correctIdx: idx })}
                  />
                  <input
                    placeholder={`Option ${idx + 1}`}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm bg-canvas border border-line rounded-md"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold mb-1">Grading Rubric</label>
              <input
                value={form.rubric}
                onChange={(e) => setForm({ ...form, rubric: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
                placeholder="Key points required for full marks..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-line rounded-md">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold bg-navy-900 text-white rounded-md">
              Save Question
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          placeholder="Filter by topic..."
          className="px-3 py-1.5 text-sm bg-surface border border-line rounded-md"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface border border-line rounded-md"
        >
          <option value="all">All Types</option>
          <option value="mcq_single">Single MCQ</option>
          <option value="mcq_multi">Multi-Select</option>
          <option value="written">Written</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="font-mono text-sm text-ink-muted">Loading questions...</p>
        ) : (
          filtered.map((q) => (
            <div key={q.id} className="bg-surface border border-line rounded-lg p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-ink-muted mb-1">
                  <span className="px-2 py-0.5 rounded bg-navy-50 text-navy-900">{q.type}</span>
                  <span>{q.topic}</span>
                  <span>Difficulty {q.difficulty}/3</span>
                  <span>{q.marks} marks</span>
                </div>
                <p className="text-sm font-medium text-ink">{q.text}</p>
              </div>
              <button
                onClick={() => handleDelete(q.id)}
                aria-label="Delete question"
                className="p-1.5 text-ink-muted hover:text-status-danger rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
};
