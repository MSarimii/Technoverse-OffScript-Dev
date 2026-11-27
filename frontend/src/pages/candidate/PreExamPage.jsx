import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Checkbox, Badge, Skeleton, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import { Wifi, Play, RotateCcw, Shield } from 'lucide-react';

export const PreExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkingNet, setCheckingNet] = useState(false);
  const [netStatus, setNetStatus] = useState('untested'); // untested | ok | fail
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Prefetch ExamWorkspace chunk so entry is instant
    import('./ExamWorkspacePage').catch(() => {});

    attemptService
      .getCandidateExamDetail(examId)
      .then((res) => {
        const found = res.data?.exam;
        if (!found) setError('Examination not found or you are not enrolled.');
        else setExam(found);
      })
      .catch((err) => setError(err.message || 'Unable to load examination details'))
      .finally(() => setLoading(false));
  }, [examId]);

  const runConnectivityCheck = async () => {
    setCheckingNet(true);
    try {
      await attemptService.getAnnouncements(examId);
      setNetStatus('ok');
      toast.success('Connection verified. Server reachable.');
    } catch {
      setNetStatus('fail');
      toast.error('Server unreachable. Check your connection before starting.');
    } finally {
      setCheckingNet(false);
    }
  };

  const handleStart = async () => {
    if (!acknowledged || starting) return;
    setStarting(true);
    try {
      const res = await attemptService.startAttempt(examId);
      const attempt = res.data?.attempt;
      navigate(`/candidate/exam/${examId}`, { state: { attemptId: attempt.id } });
    } catch (err) {
      toast.error(err.message || 'Unable to enter examination');
      setStarting(false);
    }
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error || !exam) return <ErrorState message={error || 'Examination unavailable'} />;

  const isResume = exam.attemptStatus === 'in_progress';

  return (
    <main className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={exam.title}
        subtitle="Review instructions, connectivity, and integrity notice before entering."
        breadcrumbs={[
          { label: 'Candidate', to: '/candidate' },
          { label: 'Pre-Exam Check' },
        ]}
      />

      <section className="bg-surface border border-line rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="cobalt">{exam.durationMin} minutes</Badge>
          <Badge tone="neutral">{exam.totalMarks} total marks</Badge>
          {isResume && <Badge tone="warning">In Progress — Resume Available</Badge>}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink mb-1">Instructions & Rules</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            {exam.instructions || 'Answer all questions within the server-authoritative deadline.'}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-canvas border border-line space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink">
            <Shield className="w-4 h-4 text-cobalt" /> Integrity & Activity Logging Notice
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Tab switches, window blur, fullscreen exits, and copy/paste actions are recorded for examiner review.
            This activity is logged for examiner review and is not treated as proof of misconduct.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-canvas border border-line">
          <div className="flex items-center gap-2 text-xs font-mono">
            <Wifi className="w-4 h-4 text-cobalt" />
            <span>
              Device & Connectivity Check:{' '}
              <strong className={netStatus === 'ok' ? 'text-status-answered' : netStatus === 'fail' ? 'text-status-danger' : 'text-ink-muted'}>
                {netStatus === 'ok' ? 'Ready' : netStatus === 'fail' ? 'Unreachable' : 'Not tested'}
              </strong>
            </span>
          </div>
          <Button size="sm" variant="secondary" loading={checkingNet} onClick={runConnectivityCheck}>
            Test Connection
          </Button>
        </div>

        <Checkbox
          label="I understand the examination rules, server-authoritative timer, and activity logging notice."
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => navigate('/candidate')}>
            Back
          </Button>
          <Button disabled={!acknowledged} loading={starting} onClick={handleStart}>
            {isResume ? (
              <>
                <RotateCcw className="w-4 h-4" /> Resume Examination
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Start Examination
              </>
            )}
          </Button>
        </div>
      </section>
    </main>
  );
};
