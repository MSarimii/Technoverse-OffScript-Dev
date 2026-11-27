import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Skeleton, ErrorState } from '../../components/ui';
import { Scale } from 'lucide-react';

export const ExamFairnessPage = () => {
  const { id } = useParams();
  const [fairness, setFairness] = useState(null);
  const [qStats, setQStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('balanced'); // balanced | unbalanced

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

  const papers =
    mode === 'balanced'
      ? fairness.papers || []
      : (fairness.papers || []).map((p, i) => ({
          ...p,
          difficultyIndex: Number((1.2 + ((i * 0.7) % 1.6)).toFixed(2)),
        }));

  const indices = papers.map((p) => p.difficultyIndex);
  const min = indices.length ? Math.min(...indices) : 2.0;
  const max = indices.length ? Math.max(...indices) : 2.0;
  const spread = Number((max - min).toFixed(2));
  const mean = indices.length ? indices.reduce((s, v) => s + v, 0) / indices.length : 2.0;
  const stdev = indices.length
    ? Number(Math.sqrt(indices.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / indices.length).toFixed(3))
    : 0;

  return (
    <main className="space-y-6">
      <PageHeader
        title="5.2 Fairness of Randomized Examinations"
        subtitle="Every paper draws the same mix of topics and difficulty, so no candidate gets an easier paper by chance."
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Fairness' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'balanced' ? 'primary' : 'secondary'} onClick={() => setMode('balanced')}>
              Balanced Blueprint
            </Button>
            <Button size="sm" variant={mode === 'unbalanced' ? 'primary' : 'secondary'} onClick={() => setMode('unbalanced')}>
              Unbalanced Random (Sim)
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Min Difficulty', val: min },
          { label: 'Max Difficulty', val: max },
          { label: 'Spread (Max - Min)', val: spread },
          { label: 'Std Dev (σ)', val: stdev },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-line rounded-xl p-4">
            <div className="text-xs font-mono text-ink-muted">{kpi.label}</div>
            <div className="text-2xl font-mono font-bold text-ink mt-1">{kpi.val}</div>
          </div>
        ))}
      </section>

      {/* Dot Plot */}
      <section className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Scale className="w-4 h-4 text-cobalt" /> Paper Difficulty Index per Candidate (1.0 – 3.0 scale)
        </div>
        <div className="space-y-2.5">
          {papers.map((p) => {
            const pct = Math.min(100, Math.max(0, ((p.difficultyIndex - 1) / 2) * 100));
            return (
              <div key={p.label} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-20 text-ink-muted">{p.label}</span>
                <div className="flex-1 h-4 bg-canvas border border-line rounded-full relative">
                  <div
                    className="w-3 h-3 rounded-full bg-cobalt absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${pct}%` }}
                    title={`${p.label}: ${p.difficultyIndex}`}
                  />
                </div>
                <span className="w-12 text-right font-semibold text-ink">{p.difficultyIndex}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Question Difficulty Comparison */}
      <section className="bg-surface border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line font-semibold text-sm">
          Assigned vs Observed Question Difficulty
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-xs font-mono text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-2.5">Question</th>
                <th className="px-4 py-2.5">Topic</th>
                <th className="px-4 py-2.5">Assigned</th>
                <th className="px-4 py-2.5">Incorrect Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {qStats.map((q) => (
                <tr key={q.questionId}>
                  <td className="px-4 py-3 text-ink max-w-md truncate">{q.text}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{q.topic}</td>
                  <td className="px-4 py-3 font-mono text-xs">{q.assignedDifficulty}/3</td>
                  <td className="px-4 py-3 font-mono text-xs">{q.incorrectRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};
