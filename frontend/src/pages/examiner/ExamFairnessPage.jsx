import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Badge, Skeleton, ErrorState } from '../../components/ui';
import { Scale, AlertTriangle } from 'lucide-react';

export const ExamFairnessPage = () => {
  const { id } = useParams();
  const [fairness, setFairness] = useState(null);
  const [qStats, setQStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([examService.getFairness(id), examService.getQuestionAnalytics(id)])
      .then(([fRes, qRes]) => {
        setFairness(fRes.data);
        setQStats(qRes.data?.questions || []);
      })
      .catch((err) => setError(err.message || 'Failed to load fairness report'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error || !fairness) return <ErrorState message={error || 'Fairness data unavailable'} />;

  const stats = fairness.difficultyIndexStats || { min: 0, max: 0, mean: 0, spread: 0 };
  const strata = fairness.strataConfigured || { easy: 0, medium: 0, hard: 0, poolMode: false };

  return (
    <main className="space-y-6">
      <PageHeader
        title="5.2 Fairness of Randomized Examinations"
        subtitle="Difficulty-stratified blueprint parity across generated candidate papers."
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Fairness' }]}
        actions={
          <Badge tone={fairness.fairnessStatus === 'balanced' || fairness.fairnessStatus === 'within_tolerance' ? 'success' : 'warning'}>
            Status: {fairness.fairnessStatus}
          </Badge>
        }
      />

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Min Difficulty Index', val: stats.min },
          { label: 'Max Difficulty Index', val: stats.max },
          { label: 'Mean Index', val: stats.mean },
          { label: 'Spread (Max - Min)', val: stats.spread },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-line rounded-xl p-4">
            <div className="text-xs font-mono text-ink-muted">{kpi.label}</div>
            <div className="text-2xl font-mono font-bold text-ink mt-1">{kpi.val}</div>
          </div>
        ))}
      </section>

      <section className="bg-surface border border-line rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div>
          <div className="text-ink-muted">Real Attempts Audited</div>
          <div className="text-lg font-bold text-ink mt-1">{fairness.attemptCount ?? 0}</div>
        </div>
        <div>
          <div className="text-ink-muted">Unique Paper Fingerprints</div>
          <div className="text-lg font-bold text-ink mt-1">{fairness.uniqueFingerprints ?? 0}</div>
        </div>
        <div>
          <div className="text-ink-muted">Blueprint Configuration</div>
          <div className="text-sm font-semibold text-ink mt-1">
            Pool Mode: {strata.poolMode ? 'Enabled' : 'Disabled'} ({strata.easy} Easy · {strata.medium} Medium · {strata.hard} Hard)
          </div>
        </div>
      </section>

      <section className="bg-surface border border-line rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Scale className="w-4 h-4 text-cobalt" /> Per-Question Calibration Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-xs font-mono text-ink-muted uppercase">
              <tr>
                <th className="px-3 py-2">Question</th>
                <th className="px-3 py-2">Labeled</th>
                <th className="px-3 py-2">Observed</th>
                <th className="px-3 py-2">Correct Rate</th>
                <th className="px-3 py-2">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {qStats.map((q) => (
                <tr key={q.questionId}>
                  <td className="px-3 py-2.5 max-w-md truncate text-ink">{q.text}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{q.labeledDifficulty}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{q.observedDifficulty}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{Math.round((q.correctRate ?? 0) * 100)}%</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {q.flaggedAmbiguous ? (
                      <Badge tone="warning">
                        <AlertTriangle className="w-3 h-3" /> {q.ambiguityReason || 'Ambiguous'}
                      </Badge>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};
