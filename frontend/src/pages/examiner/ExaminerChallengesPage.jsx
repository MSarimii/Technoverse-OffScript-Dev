import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Tabs, Input, Textarea, Dialog, Skeleton, EmptyState } from '../../components/ui';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, ShieldAlert, Check, Flag } from 'lucide-react';

export const ExaminerChallengesPage = () => {
  const [searchParams] = useSearchParams();
  const examIdFilter = searchParams.get('examId') || '';

  const [tab, setTab] = useState('challenges');
  const [disputes, setDisputes] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const [actionTarget, setActionTarget] = useState(null); // { dispute, mode: 'resolved' | 'rejected' }
  const [note, setNote] = useState('');
  const [adjustedMarks, setAdjustedMarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, fRes] = await Promise.all([
        examService.getAllDisputes(examIdFilter || undefined),
        examService.getIntegrityFlags(examIdFilter || undefined),
      ]);
      setDisputes(dRes.data?.disputes || []);
      setFlags(fRes.data?.flags || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [examIdFilter]);

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!actionTarget || !note.trim() || submitting) {
      toast.error('Please enter a brief professor note for the audit trail.');
      return;
    }
    setSubmitting(true);
    try {
      await examService.resolveDispute(actionTarget.dispute.id, {
        status: actionTarget.mode,
        reason: note.trim(),
        newMarks:
          actionTarget.mode === 'resolved' && adjustedMarks !== ''
            ? Number(adjustedMarks)
            : undefined,
      });
      toast.success(
        actionTarget.mode === 'resolved' ? 'Challenge upheld & score updated' : 'Challenge dismissed'
      );
      setActionTarget(null);
      setNote('');
      setAdjustedMarks('');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkFlagReviewed = async (flagId) => {
    try {
      await examService.markFlagReviewed(flagId);
      setFlags((prev) => prev.map((f) => (f.id === flagId ? { ...f, reviewed: true } : f)));
      toast.success('Integrity event marked reviewed');
    } catch (err) {
      toast.error(err.message || 'Could not update flag');
    }
  };

  const pendingChallengesCount = disputes.filter(
    (d) => d.status !== 'resolved' && d.status !== 'rejected'
  ).length;
  const unreviewedFlagsCount = flags.filter((f) => !f.reviewed).length;

  return (
    <main className="space-y-6">
      <PageHeader
        title="Challenges & Integrity Review"
        subtitle="Review candidate answer challenges with versioned score adjustments and inspect neutral telemetry events."
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Challenges & Integrity' }]}
      />

      <Tabs
        items={[
          { key: 'challenges', label: `Answer Challenges (${pendingChallengesCount} pending)` },
          { key: 'integrity', label: `Integrity Flags (${unreviewedFlagsCount} unreviewed)` },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : tab === 'challenges' ? (
        disputes.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No pending answer challenges"
            description="Candidate challenges submitted from published transcripts will appear here."
          />
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => {
              const isUpheld = d.status === 'resolved';
              const isDismissed = d.status === 'rejected';
              return (
                <article
                  key={d.id}
                  className="luxury-card rounded-2xl border-t-2 border-t-[#0B0F0E] p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-display font-semibold text-base text-ink">
                          {d.candidateName}
                        </span>
                        <Badge
                          tone={isUpheld ? 'success' : isDismissed ? 'neutral' : 'warning'}
                          dot={isDismissed ? 'slate' : undefined}
                        >
                          {isUpheld ? 'Upheld' : isDismissed ? 'Dismissed' : 'Challenge Pending'}
                        </Badge>
                        <Badge tone="neutral">{d.category}</Badge>
                      </div>
                      <div className="text-xs font-mono text-ink-muted">{d.examTitle}</div>
                    </div>
                    <div className="text-xs font-mono text-ink-muted tabular-nums">
                      Current: <strong className="text-ink">{d.currentMarks}</strong> / {d.maxMarks} marks
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-ink">{d.questionText}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-canvas border border-line">
                        <div className="font-mono uppercase text-[10px] text-ink-muted mb-1">
                          Candidate&apos;s Answer
                        </div>
                        <p className="font-mono text-ink">
                          {Array.isArray(d.candidateAnswer)
                            ? d.candidateAnswer.join(', ')
                            : String(d.candidateAnswer)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-canvas border border-line">
                        <div className="font-mono uppercase text-[10px] text-ink-muted mb-1">
                          Submitted Rationale
                        </div>
                        <p className="text-ink">{d.explanation}</p>
                      </div>
                    </div>
                  </div>

                  {d.reason && (
                    <div className="p-3 rounded-xl bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-mono text-[#18181B]">
                      Professor note: {d.reason}
                    </div>
                  )}

                  {!isUpheld && !isDismissed && (
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-line">
                      <button
                        type="button"
                        onClick={() => {
                          setActionTarget({ dispute: d, mode: 'rejected' });
                          setNote('');
                          setAdjustedMarks('');
                        }}
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FECACA] transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Dismiss with Note
                      </button>
                      <Button
                        size="sm"
                        variant="emerald"
                        onClick={() => {
                          setActionTarget({ dispute: d, mode: 'resolved' });
                          setNote('');
                          setAdjustedMarks(String(d.currentMarks ?? ''));
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Adjust Score
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      ) : flags.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No integrity flags recorded"
          description="Telemetry indicators (tab switches, window blur, fullscreen exit, late-sync) appear here for review."
        />
      ) : (
        <div className="luxury-card rounded-2xl border-t-2 border-t-[#0B0F0E] overflow-hidden">
          <div className="px-5 py-3.5 bg-subtle/60 border-b border-line flex items-center gap-2 text-xs font-mono text-ink-muted">
            <ShieldAlert className="w-4 h-4 text-ink" />
            Telemetry indicators are neutral context for review, not proof of misconduct.
          </div>
          <div className="divide-y divide-line">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-ink">{flag.candidateName}</span>
                    <Badge tone={flag.reviewed ? 'success' : 'warning'}>
                      {flag.type}
                    </Badge>
                    {flag.reviewed && <Badge tone="neutral">Reviewed</Badge>}
                  </div>
                  <div className="text-xs font-mono text-ink-muted">
                    {flag.examTitle} · {flag.timestamp ? new Date(flag.timestamp).toLocaleString() : 'Recorded'}
                  </div>
                </div>
                {!flag.reviewed && (
                  <Button size="sm" variant="secondary" onClick={() => handleMarkFlagReviewed(flag.id)}>
                    <Check className="w-3.5 h-3.5 text-[#059669]" /> Mark Reviewed
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(actionTarget)}
        onClose={() => setActionTarget(null)}
        title={
          actionTarget?.mode === 'resolved'
            ? 'Approve Challenge & Adjust Score'
            : 'Dismiss Challenge with Note'
        }
      >
        <form onSubmit={handleResolveSubmit} className="space-y-4">
          {actionTarget?.mode === 'resolved' && (
            <Input
              label={`Adjusted Marks (max ${actionTarget.dispute.maxMarks})`}
              type="number"
              step="0.5"
              min="0"
              max={actionTarget.dispute.maxMarks}
              value={adjustedMarks}
              onChange={(e) => setAdjustedMarks(e.target.value)}
            />
          )}
          <Textarea
            label="Professor Audit Note (Required)"
            required
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Record the reason for this decision..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setActionTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionTarget?.mode === 'resolved' ? 'emerald' : 'danger'}
              loading={submitting}
            >
              {actionTarget?.mode === 'resolved' ? 'Approve & Save Grade' : 'Confirm Dismiss'}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
};
