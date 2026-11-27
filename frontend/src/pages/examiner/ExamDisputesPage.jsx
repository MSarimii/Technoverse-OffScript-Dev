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
  const [reason, setReason] = useState('');
  const [newMarks, setNewMarks] = useState('');
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
    if (!selected || !reason.trim()) {
      toast.error('A resolution reason is required for the audit trail.');
      return;
    }
    setResolving(true);
    try {
      await examService.resolveDispute(selected.id, {
        status,
        reason: reason.trim(),
        newMarks: status === 'resolved' && newMarks !== '' ? Number(newMarks) : undefined,
      });
      toast.success(`Dispute marked ${status}`);
      setReason('');
      setNewMarks('');
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
        subtitle="Original grade preserved; changes are versioned and attributable."
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Disputes Inbox' }]}
        actions={
          <Select aria-label="Filter disputes" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
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
                  <span className="font-semibold text-sm text-ink">{d.candidateName}</span>
                  <Badge tone={d.status === 'resolved' ? 'success' : d.status === 'rejected' ? 'danger' : 'warning'}>
                    {d.status}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-ink-muted">{d.category}</p>
              </button>
            ))}
          </aside>

          {selected && (
            <section className="lg:col-span-2 bg-surface border border-line rounded-xl p-6 space-y-5">
              <div className="border-b border-line pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-cobalt mb-1">
                  <Scale className="w-4 h-4" /> Side-by-Side Review
                </div>
                <h2 className="font-semibold text-base text-ink">{selected.questionText}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3.5 rounded-lg bg-canvas border border-line">
                  <div className="text-xs font-mono text-ink-muted mb-1">Candidate Response</div>
                  <p className="text-ink">{selected.candidateAnswer}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-canvas border border-line">
                  <div className="text-xs font-mono text-ink-muted mb-1">Rubric / Max ({selected.maxMarks})</div>
                  <p className="text-ink">{selected.rubric || 'Objective marking scheme'}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                <strong className="block mb-1">Candidate&apos;s Concern ({selected.category}):</strong>
                {selected.explanation}
              </div>

              {/* Immutable Grade Version Audit Trail */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase text-ink-muted">Grade Version Audit Trail</h3>
                {(selected.gradeVersions || []).map((v) => (
                  <div key={v.version} className="flex items-center justify-between text-xs font-mono p-2.5 rounded bg-canvas border border-line">
                    <span>v{v.version}: <strong>{v.marks}</strong> marks — {v.reason}</span>
                    <span className="text-ink-muted">{new Date(v.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-line space-y-3">
                <Textarea
                  label="Resolution Reason (Required)"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain decision for audit trail..."
                />
                <Input
                  label={`Optional Re-grade Marks (0 – ${selected.maxMarks}, creates new version)`}
                  type="number"
                  min={0}
                  max={selected.maxMarks}
                  step={0.5}
                  value={newMarks}
                  onChange={(e) => setNewMarks(e.target.value)}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="danger" loading={resolving} onClick={() => handleResolve('rejected')}>
                    <XCircle className="w-4 h-4" /> Reject Concern
                  </Button>
                  <Button loading={resolving} onClick={() => handleResolve('resolved')}>
                    <CheckCircle2 className="w-4 h-4" /> Resolve & Version Grade
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
