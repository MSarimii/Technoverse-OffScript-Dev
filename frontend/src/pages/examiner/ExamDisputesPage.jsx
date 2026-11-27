import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Select, Textarea, Input, Skeleton, EmptyState } from '../../components/ui';
import { toast } from 'sonner';
import { Scale, CheckCircle2, XCircle } from 'lucide-react';

export const ExamDisputesPage = () => {
  const { id } = useParams();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [adjustedScore, setAdjustedScore] = useState('');
  const [resolving, setResolving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await examService.getDisputes(id);
      const list = res.data?.disputes || [];
      setDisputes(list);
      if (list.length > 0 && !selected) {
        setSelected(list[0]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleResolve = async (status) => {
    if (!selected || !resolutionNote.trim()) {
      toast.error('A resolution note is required for the audit trail.');
      return;
    }
    setResolving(true);
    try {
      await examService.resolveDispute(selected.id, {
        status,
        resolutionNote: resolutionNote.trim(),
        ...(status === 'accepted' && adjustedScore !== '' ? { adjustedScore: Number(adjustedScore) } : {}),
      });
      toast.success(`Dispute marked ${status}`);
      setResolutionNote('');
      setAdjustedScore('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResolving(false);
    }
  };

  const visible = statusFilter === 'all' ? disputes : disputes.filter((d) => d.status === statusFilter);

  return (
    <main className="space-y-6">
      <PageHeader
        title="5.4 Trust & Dispute Resolution"
        subtitle="Original grade preserved; adjustments recalculate totals & HMAC report verification."
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Disputes Inbox' }]}
        actions={
          <Select aria-label="Filter disputes" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </Select>
        }
      />

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : visible.length === 0 ? (
        <EmptyState title="No disputes found" description="Candidate concerns for this examination will appear here." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="space-y-2">
            {visible.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selected?.id === d.id ? 'bg-navy-50 border-cobalt' : 'bg-surface border-line hover:bg-subtle'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm text-ink">{d.candidate?.name || d.candidateName || 'Candidate'}</span>
                  <Badge tone={d.status === 'accepted' ? 'success' : d.status === 'rejected' ? 'danger' : 'warning'}>
                    {d.status}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-ink-muted truncate">{d.question?.text || d.questionId}</p>
              </button>
            ))}
          </aside>

          {selected && (
            <section className="lg:col-span-2 bg-surface border border-line rounded-xl p-6 space-y-5">
              <div className="border-b border-line pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-cobalt mb-1">
                  <Scale className="w-4 h-4" /> Dispute Review
                </div>
                <h2 className="font-semibold text-base text-ink">{selected.question?.text || `Question ${selected.questionId}`}</h2>
                {selected.question?.marks !== undefined && (
                  <p className="text-xs font-mono text-ink-muted mt-1">Max Marks: {selected.question.marks}</p>
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                <strong className="block mb-1">Candidate&apos;s Concern:</strong>
                {selected.reason}
              </div>

              {selected.resolutionNote && (
                <div className="p-3.5 rounded-lg bg-canvas border border-line text-xs font-mono space-y-1">
                  <div>Status: <strong>{selected.status}</strong></div>
                  <div>Note: {selected.resolutionNote}</div>
                  {selected.adjustedScore !== null && selected.adjustedScore !== undefined && (
                    <div>Adjusted Score: <strong>{selected.adjustedScore}</strong></div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-line space-y-3">
                <Textarea
                  label="Resolution Note (Required)"
                  rows={2}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explain decision for audit trail..."
                />
                <Input
                  label={`Optional Adjusted Score (0 – ${selected.question?.marks ?? 100})`}
                  type="number"
                  min={0}
                  max={selected.question?.marks}
                  step={0.25}
                  value={adjustedScore}
                  onChange={(e) => setAdjustedScore(e.target.value)}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="danger" loading={resolving} onClick={() => handleResolve('rejected')}>
                    <XCircle className="w-4 h-4" /> Reject Concern
                  </Button>
                  <Button loading={resolving} onClick={() => handleResolve('accepted')}>
                    <CheckCircle2 className="w-4 h-4" /> Accept & Resolve
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
};
