import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Skeleton, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import { Edit3, Send, FlaskConical, Activity, CheckSquare, BarChart3, Download, RefreshCw, Trash2 } from 'lucide-react';

export const ExamDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await examService.getExamById(id);
      setExam(res.data?.exam);
    } catch (err) {
      setError(err.message || 'Unable to load examination');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handlePublish = async () => {
    try {
      await examService.publishExam(id);
      toast.success('Examination published');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${exam?.title}"?`)) return;
    try {
      await examService.deleteExam(id);
      toast.success('Examination deleted');
      navigate('/examiner', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRegrade = async () => {
    try {
      const res = await examService.regradeExam(id);
      toast.success(`Objective regrade complete (${res.data?.regraded ?? 0} attempt(s) updated)`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCsvExport = async () => {
    try {
      await examService.downloadResultsCsv(id);
      toast.success('Results CSV downloaded');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (error || !exam) return <ErrorState message={error || 'Examination not found'} onRetry={load} />;

  const st = exam.effectiveStatus || exam.derivedStatus || exam.status;
  const durationMinutes = exam.durationMinutes ?? exam.durationMin;
  const questionCount = exam.questionCount ?? exam.questions?.length ?? exam.questionRefs?.length ?? 0;
  const enrolledCount = exam.enrolledCount ?? exam.enrolledCandidateIds?.length ?? 0;

  return (
    <main className="space-y-6">
      <PageHeader
        title={exam.title}
        subtitle={exam.instructions}
        breadcrumbs={[
          { label: 'Examiner', to: '/examiner' },
          { label: 'Examination Detail' },
        ]}
        actions={
          <>
            {st === 'draft' && (
              <>
                <Link
                  to={`/examiner/exams/${id}/edit`}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-line rounded-lg bg-surface hover:bg-subtle"
                >
                  <Edit3 className="w-4 h-4" /> Edit Draft
                </Link>
                <Button onClick={handlePublish}>
                  <Send className="w-4 h-4" /> Publish
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => navigate(`/examiner/challenges?examId=${id}`)}>
              View Challenges &amp; Integrity →
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/candidate/exam/${id}?sandbox=1`)}>
              <FlaskConical className="w-4 h-4 text-status-review" /> Preview as Candidate
            </Button>
            {st === 'ongoing' && (
              <Link
                to={`/examiner/exams/${id}/monitor`}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-cobalt text-white rounded-lg"
              >
                <Activity className="w-4 h-4" /> Live Monitor
              </Link>
            )}
            {(st === 'completed' || st === 'ongoing') && (
              <Link
                to={`/examiner/exams/${id}/grading`}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-line rounded-lg bg-surface hover:bg-subtle"
              >
                <CheckSquare className="w-4 h-4 text-status-answered" /> Grade Submissions
              </Link>
            )}
            {st === 'completed' && (
              <>
                <Link
                  to={`/examiner/exams/${id}/analytics`}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-line rounded-lg bg-surface hover:bg-subtle"
                >
                  <BarChart3 className="w-4 h-4" /> Analytics
                </Link>
                <Button variant="secondary" onClick={handleRegrade}>
                  <RefreshCw className="w-4 h-4" /> Regrade
                </Button>
                <Button variant="secondary" onClick={handleCsvExport}>
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="flex items-center gap-2">
        <Badge tone={st === 'ongoing' ? 'cobalt' : st === 'completed' ? 'success' : 'neutral'}>
          Lifecycle: {st}
        </Badge>
        {exam.resultsPublished && <Badge tone="success">Results Published</Badge>}
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Duration', val: `${durationMinutes} min` },
          { label: 'Total Marks', val: exam.totalMarks },
          { label: 'Questions', val: questionCount },
          { label: 'Enrolled', val: enrolledCount },
        ].map((item) => (
          <div key={item.label} className="bg-surface border border-line rounded-xl p-4">
            <div className="text-xs font-mono text-ink-muted">{item.label}</div>
            <div className="text-2xl font-mono font-bold text-ink mt-1">{item.val}</div>
          </div>
        ))}
      </section>

      <section className="bg-surface border border-line rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs font-mono text-ink-muted">Availability Window</div>
          <div className="font-mono text-xs text-ink mt-1">
            {new Date(exam.startAt).toLocaleString()} → {new Date(exam.endAt).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-ink-muted">Randomization & Fairness</div>
          <div className="font-mono text-xs text-ink mt-1">
            Shuffle Questions: {exam.settings?.shuffleQuestions ? 'Yes' : 'No'} · Shuffle Options:{' '}
            {exam.settings?.shuffleOptions ? 'Yes' : 'No'} · Balanced Blueprint:{' '}
            {exam.blueprint?.poolMode
              ? `Enabled (${exam.blueprint.easy}E / ${exam.blueprint.medium}M / ${exam.blueprint.hard}H)`
              : 'Disabled'}
          </div>
        </div>
      </section>
    </main>
  );
};
