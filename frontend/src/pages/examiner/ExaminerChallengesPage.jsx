import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { getInitials } from '../../lib/initials';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Tabs, Input, Textarea, Dialog, Skeleton, EmptyState, SlideOverDrawer, DrawerSection } from '../../components/ui';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, ShieldAlert, Check, Flag, ChevronRight } from 'lucide-react';

export const ExaminerChallengesPage = () => {
  const [searchParams] = useSearchParams();
  const examIdFilter = searchParams.get('examId') || '';

  const [tab, setTab] = useState('challenges');
  const [disputes, setDisputes] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDispute, setSelectedDispute] = useState(null);
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
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-white/[0.03] border-b border-[var(--line)] text-[var(--muted)] text-[11px] uppercase font-mono tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium">Candidate</th>
                    <th className="px-4 py-3 font-medium">Challenge &amp; Question</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {disputes.map((d) => {
                    const isUpheld = d.status === 'resolved';
                    const isDismissed = d.status === 'rejected';
                    return (
                      <tr
                        key={d.id}
                        onClick={() => setSelectedDispute(d)}
                        className="group cursor-pointer hover:bg-zinc-50/90 dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[#ECFDF5] dark:bg-emerald-500/15 text-[#065F46] dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-500/25 font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                              {getInitials(d.candidateName)}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-[var(--ink)] truncate">{d.candidateName}</div>
                              <div className="text-[11px] font-mono text-[var(--muted)] truncate">{d.candidateEmail || d.examTitle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-md">
                          <div className="text-sm font-medium text-[var(--ink)] line-clamp-1">{d.questionText}</div>
                          <div className="text-[11px] font-mono text-[var(--muted)] mt-0.5">{d.category} · {d.examTitle}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-[var(--muted)]">
                          <strong className="text-[var(--ink)]">{d.currentMarks}</strong> / {d.maxMarks}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            tone={isUpheld ? 'success' : isDismissed ? 'neutral' : 'warning'}
                            dot={isDismissed ? 'slate' : undefined}
                          >
                            {isUpheld ? 'Upheld' : isDismissed ? 'Dismissed' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)] group-hover:text-[var(--ink)] transition-colors">
                            Review <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : flags.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No integrity flags recorded"
          description="Telemetry indicators (tab switches, window blur, fullscreen exit, late-sync) appear here for review."
        />
      ) : (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-zinc-50 dark:bg-white/[0.03] border-b border-[var(--line)] flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
            <ShieldAlert className="w-4 h-4 text-[var(--ink)]" />
            Telemetry indicators are neutral context for review, not proof of misconduct.
          </div>
          <div className="divide-y divide-[var(--line)]">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/90 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--ink)]">{flag.candidateName}</span>
                    <Badge tone={flag.reviewed ? 'success' : 'warning'}>
                      {flag.type}
                    </Badge>
                    {flag.reviewed && <Badge tone="neutral">Reviewed</Badge>}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--muted)] tabular-nums">
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

      {/* Slide-over Challenge Review Drawer */}
      <SlideOverDrawer
        open={Boolean(selectedDispute)}
        onClose={() => setSelectedDispute(null)}
        eyebrow="Challenges & Integrity"
        title={selectedDispute ? `Challenge Review · ${selectedDispute.candidateName}` : 'Challenge Review'}
      >
        {selectedDispute && (
          <>
            <div className="space-y-4">
              <DrawerSection index={0} className="flex flex-wrap items-center justify-between gap-2">
                {selectedDispute.status === 'resolved' ? (
                  <Badge tone="success">Upheld</Badge>
                ) : selectedDispute.status === 'rejected' ? (
                  <Badge tone="neutral" dot="slate">Dismissed</Badge>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25">
                    Pending
                  </span>
                )}
                <span className="text-xs font-mono text-[var(--muted)] tabular-nums">
                  Score: <strong className="text-[var(--ink)]">{selectedDispute.currentMarks}</strong> / {selectedDispute.maxMarks}
                </span>
              </DrawerSection>

              <DrawerSection index={1} className="space-y-3">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] mb-1">Question</div>
                  <p className="text-sm font-medium text-[var(--ink)]">{selectedDispute.questionText}</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas border border-[var(--line)]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] mb-1">
                    Candidate&apos;s Answer
                  </div>
                  <p className="text-xs font-mono text-[var(--ink)]">
                    {Array.isArray(selectedDispute.candidateAnswer)
                      ? selectedDispute.candidateAnswer.join(', ')
                      : String(selectedDispute.candidateAnswer)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-canvas border border-[var(--line)]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] mb-1">
                    Submitted Rationale
                  </div>
                  <p className="text-xs text-[var(--ink)]">{selectedDispute.explanation}</p>
                </div>
                {selectedDispute.reason && (
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.05] border border-[var(--line)] text-xs font-mono text-[var(--ink)]">
                    Professor note: {selectedDispute.reason}
                  </div>
                )}
              </DrawerSection>
            </div>

            {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'rejected' && (
              <DrawerSection index={2} className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedDispute;
                    setSelectedDispute(null);
                    setActionTarget({ dispute: target, mode: 'rejected' });
                    setNote('');
                    setAdjustedMarks('');
                  }}
                  className="h-9 px-3 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-red-600 hover:bg-red-50 border border-[var(--line)] inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" /> Dismiss with Note
                </button>
                <Button
                  size="sm"
                  variant="emerald"
                  onClick={() => {
                    const target = selectedDispute;
                    setSelectedDispute(null);
                    setActionTarget({ dispute: target, mode: 'resolved' });
                    setNote('');
                    setAdjustedMarks(String(target.currentMarks ?? ''));
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Adjust Score
                </Button>
              </DrawerSection>
            )}
          </>
        )}
      </SlideOverDrawer>

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
