import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examService } from '../../services/examService';
import { toast } from 'sonner';
import { Plus, Eye, Activity, CheckSquare, BarChart3, FlaskConical, Send } from 'lucide-react';

export const ExaminerDashboardPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await examService.getExams();
      setExams(res.data?.exams || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePublish = async (id) => {
    try {
      await examService.publishExam(id);
      toast.success('Examination published');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const visible = filter === 'all' ? exams : exams.filter((e) => e.derivedStatus === filter);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">Examiner Console</h1>
          <p className="text-sm text-ink-muted">Create, sandbox-test, monitor, grade, and analyze examinations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/examiner/questions"
            className="px-4 py-2 text-sm font-medium border border-line rounded-md bg-surface hover:bg-subtle"
          >
            Question Bank
          </Link>
          <Link
            to="/examiner/exams/new"
            className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-md active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> New Examination
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'draft', 'published', 'ongoing', 'completed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase border ${
              filter === st ? 'bg-navy-900 text-white border-navy-900' : 'bg-surface border-line text-ink-muted hover:text-ink'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center font-mono text-sm text-ink-muted">Loading examinations...</div>
      ) : visible.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-10 text-center text-sm text-ink-muted">
          No examinations match this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((exam) => (
            <article key={exam.id} className="bg-surface border border-line rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-navy-50 text-navy-900">
                      {exam.derivedStatus}
                    </span>
                    {exam.resultsPublished && (
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-status-answered">
                        Results Published
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-ink">{exam.title}</h2>
                  <p className="text-xs font-mono text-ink-muted mt-1">
                    {exam.durationMin} min · {exam.totalMarks} marks · {exam.questionRefs?.length || 0} questions ·{' '}
                    {exam.enrolledCandidateIds?.length || 0} enrolled
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/candidate/exam/${exam.id}?sandbox=1`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-md bg-canvas hover:bg-subtle"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-amber-700" /> Sandbox
                  </button>
                  {exam.status === 'draft' && (
                    <button
                      onClick={() => handlePublish(exam.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-navy-900 text-white rounded-md"
                    >
                      <Send className="w-3.5 h-3.5" /> Publish
                    </button>
                  )}
                  <Link
                    to={`/examiner/exams/${exam.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-md bg-canvas hover:bg-subtle"
                  >
                    <Eye className="w-3.5 h-3.5" /> Configure
                  </Link>
                  <Link
                    to={`/examiner/exams/${exam.id}/monitor`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-md bg-canvas hover:bg-subtle"
                  >
                    <Activity className="w-3.5 h-3.5 text-navy-800" /> Monitor
                  </Link>
                  <Link
                    to={`/examiner/exams/${exam.id}/grading`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-md bg-canvas hover:bg-subtle"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-status-answered" /> Grade
                  </Link>
                  <Link
                    to={`/examiner/exams/${exam.id}/analytics`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-line rounded-md bg-canvas hover:bg-subtle"
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> Analytics
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};
