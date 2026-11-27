import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { examService } from '../../services/examService';
import { USE_MOCK } from '../../services/api';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Scale } from 'lucide-react';

export const ExamAnalyticsPage = () => {
  const { id } = useParams();
  const [summaryData, setSummaryData] = useState(null);
  const [qStats, setQStats] = useState([]);
  const [fairness, setFairness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examService.getAnalytics(id),
      examService.getQuestionAnalytics(id),
      examService.getFairness(id),
    ])
      .then(([aRes, qRes, fRes]) => {
        setSummaryData(aRes.data);
        setQStats(qRes.data?.questions || []);
        setFairness(fRes.data);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center font-mono text-sm text-ink-muted">Computing analytics...</div>;
  }

  const summary = summaryData?.summary || {};
  const maxBucket = Math.max(1, ...(summary.distribution || []).map((b) => b.count));

  const handleExamPdf = () => {
    if (USE_MOCK) {
      window.print();
      return;
    }
    window.open(examService.getExamReportUrl(id), '_blank', 'noopener');
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/examiner" className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-ink mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to console
          </Link>
          <h1 className="font-serif text-3xl text-ink">Analytics & Fairness Report</h1>
          <p className="text-sm text-ink-muted">{summaryData?.exam?.title} (Sandbox attempts excluded)</p>
        </div>
        <button
          onClick={handleExamPdf}
          className="inline-flex items-center gap-1.5 bg-navy-900 text-white text-sm font-semibold px-4 py-2 rounded-md"
        >
          <Printer className="w-4 h-4" /> Download Exam PDF (4.2)
        </button>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Graded Attempts', val: summary.attemptCount ?? 0 },
          { label: 'Mean Score', val: summary.mean ?? 0 },
          { label: 'Median Score', val: summary.median ?? 0 },
          { label: 'Pass Rate', val: `${summary.passRate ?? 0}%` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-line rounded-lg p-4">
            <div className="text-xs font-mono text-ink-muted">{kpi.label}</div>
            <div className="text-2xl font-mono font-bold text-ink mt-1">{kpi.val}</div>
          </div>
        ))}
      </section>

      {/* Distribution + Fairness (5.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-surface border border-line rounded-lg p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Score Distribution</h2>
          <div className="space-y-3">
            {(summary.distribution || []).map((d) => (
              <div key={d.bucket} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-16 text-ink-muted">{d.bucket}</span>
                <div className="flex-1 bg-canvas h-5 rounded overflow-hidden border border-line">
                  <div
                    className="bg-navy-800 h-full"
                    style={{ width: `${Math.round((d.count / maxBucket) * 100)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-ink">{d.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface border border-line rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-navy-800" />
            <h2 className="text-sm font-semibold text-ink">5.2 Randomized Paper Fairness Spread</h2>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Difficulty Index across generated papers: Min {fairness?.minDifficulty} · Max {fairness?.maxDifficulty} · σ = {fairness?.stdev}
          </p>
          <div className="space-y-2">
            {(fairness?.papers || []).map((p) => (
              <div key={p.label} className="flex items-center justify-between text-xs font-mono p-2 rounded bg-canvas border border-line">
                <span>{p.label}</span>
                <span className="font-semibold text-navy-900">Index {p.difficultyIndex}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Question Analytics (4.5) */}
      <section className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line font-semibold text-sm">
          Question-Level Analytics (4.5)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-xs font-mono text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-2.5">Question</th>
                <th className="px-4 py-2.5">Topic</th>
                <th className="px-4 py-2.5">Difficulty</th>
                <th className="px-4 py-2.5">Skip Rate</th>
                <th className="px-4 py-2.5">Incorrect Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {qStats.map((q) => (
                <tr key={q.questionId}>
                  <td className="px-4 py-3 text-ink max-w-md truncate">{q.text}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{q.topic}</td>
                  <td className="px-4 py-3 font-mono text-xs">{q.assignedDifficulty}/3</td>
                  <td className="px-4 py-3 font-mono text-xs">{q.skipRate}%</td>
                  <td className="px-4 py-3 font-mono text-xs text-status-danger">{q.incorrectRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};
