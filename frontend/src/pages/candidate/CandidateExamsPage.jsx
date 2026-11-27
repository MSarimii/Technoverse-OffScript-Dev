import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { toast } from 'sonner';
import { Clock, Play, RotateCcw, CheckCircle, Calendar } from 'lucide-react';

export const CandidateExamsPage = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('available'); // available | upcoming | completed
  const [selectedExam, setSelectedExam] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    attemptService
      .getCandidateExams()
      .then((res) => setExams(res.data?.exams || []))
      .catch((err) => toast.error(err.message || 'Failed to load exams'))
      .finally(() => setLoading(false));
  }, []);

  const available = exams.filter((e) => e.derivedStatus === 'ongoing' && e.attemptStatus !== 'submitted' && e.attemptStatus !== 'graded');
  const upcoming = exams.filter((e) => e.derivedStatus === 'published');
  const completed = exams.filter((e) => e.derivedStatus === 'completed' || e.attemptStatus === 'submitted' || e.attemptStatus === 'graded');

  const visible = tab === 'available' ? available : tab === 'upcoming' ? upcoming : completed;

  const handleEnterExam = async (exam) => {
    setStarting(true);
    try {
      const res = await attemptService.startAttempt(exam.id);
      const attempt = res.data?.attempt;
      navigate(`/candidate/exam/${exam.id}`, { state: { attemptId: attempt.id } });
    } catch (err) {
      toast.error(err.message || 'Unable to enter examination');
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-ink">My Examinations</h1>
        <p className="text-sm text-ink-muted">View scheduled windows, instructions, and active attempts.</p>
      </div>

      <div className="flex gap-2 border-b border-line mb-6">
        {[
          { key: 'available', label: `Available (${available.length})` },
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'completed', label: `Completed (${completed.length})` },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === item.key
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center font-mono text-sm text-ink-muted">Loading examinations...</div>
      ) : visible.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-10 text-center text-sm text-ink-muted">
          No {tab} examinations at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((exam) => (
            <article
              key={exam.id}
              className="bg-surface border border-line rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-navy-50 text-navy-900">
                    {exam.derivedStatus}
                  </span>
                  {exam.attemptStatus === 'in_progress' && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      In Progress
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-ink">{exam.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {exam.durationMin} min
                  </span>
                  <span>{exam.totalMarks} marks</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Closes {new Date(exam.endAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {tab === 'available' && (
                  <button
                    onClick={() => setSelectedExam(exam)}
                    className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2.5 rounded-md active:scale-[0.98]"
                  >
                    {exam.attemptStatus === 'in_progress' ? (
                      <>
                        <RotateCcw className="w-4 h-4" /> Resume Exam
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Start Exam
                      </>
                    )}
                  </button>
                )}
                {tab === 'completed' && exam.resultsPublished && exam.attemptId && (
                  <button
                    onClick={() => navigate(`/candidate/results/${exam.attemptId}`)}
                    className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-md"
                  >
                    <CheckCircle className="w-4 h-4" /> View Result
                  </button>
                )}
                {tab === 'completed' && !exam.resultsPublished && (
                  <span className="text-xs font-mono text-ink-muted">Results pending publication</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-surface border border-line rounded-lg max-w-lg w-full p-6 space-y-4">
            <h2 className="font-serif text-2xl text-ink">{selectedExam.title}</h2>
            <div className="p-3.5 rounded-md bg-canvas border border-line text-sm text-ink leading-relaxed">
              {selectedExam.instructions || 'Follow all academic integrity guidelines.'}
            </div>
            <ul className="text-xs font-mono text-ink-muted space-y-1">
              <li>Duration: {selectedExam.durationMin} minutes (server-authoritative timer)</li>
              <li>Total Marks: {selectedExam.totalMarks}</li>
              <li>Answers autosave continuously; offline answers sync upon reconnection.</li>
              <li>Integrity notice: Tab switches, blur, and paste events are logged for examiner review and are not treated as proof of misconduct.</li>
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2 text-sm border border-line rounded-md bg-canvas"
              >
                Cancel
              </button>
              <button
                disabled={starting}
                onClick={() => handleEnterExam(selectedExam)}
                className="px-5 py-2 text-sm font-semibold bg-navy-900 text-white rounded-md active:scale-[0.98]"
              >
                {starting ? 'Preparing paper...' : 'Confirm & Enter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
