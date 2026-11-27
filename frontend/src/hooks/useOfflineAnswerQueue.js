import { useState, useEffect, useRef, useCallback } from 'react';
import { attemptService } from '../services/attemptService';
import { readQueue, writeQueue, clearQueue } from '../lib/offlineQueue';

function isSingleType(type) {
  return type === 'single' || type === 'mcq_single';
}

function isWrittenType(type) {
  return type === 'written';
}

export function useOfflineAnswerQueue({ attemptId, paper, initialAnswers, initialMarked }) {
  const seqKey = attemptId ? `sems_seq_${attemptId}` : null;

  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(initialMarked || []);
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [syncStatus, setSyncStatus] = useState('saved');
  const [lateSyncedCount, setLateSyncedCount] = useState(0);

  const seqRef = useRef(Number((seqKey && localStorage.getItem(seqKey)) || '0'));
  const flushTimerRef = useRef(null);
  const flushingRef = useRef(false);
  const offlineBufferedRef = useRef(false);

  const typeMapRef = useRef({});
  useEffect(() => {
    const map = {};
    (paper || []).forEach((q) => {
      const qid = q.questionId || q.id;
      if (qid) map[qid] = q.type;
    });
    typeMapRef.current = map;
  }, [paper]);

  useEffect(() => {
    if (!attemptId) return;
    let mounted = true;
    readQueue(attemptId).then((localQ) => {
      if (!mounted) return;
      const map = {};
      const markedSet = new Set(initialMarked || []);
      let maxSeq = Number((seqKey && localStorage.getItem(seqKey)) || '0');

      if (Array.isArray(initialAnswers)) {
        initialAnswers.forEach((item) => {
          const qid = item.questionId;
          const qType = typeMapRef.current[qid];
          if (item.seq && item.seq > maxSeq) maxSeq = item.seq;
          if (item.markedForReview) markedSet.add(qid);
          if (isWrittenType(qType)) {
            map[qid] = item.text ?? '';
          } else if (isSingleType(qType)) {
            map[qid] = item.selectedOptionIds?.[0] || '';
          } else if (Array.isArray(item.selectedOptionIds) && item.selectedOptionIds.length > 0) {
            map[qid] = item.selectedOptionIds;
          } else if (item.text) {
            map[qid] = item.text;
          }
        });
      } else if (initialAnswers && typeof initialAnswers === 'object') {
        Object.entries(initialAnswers).forEach(([qid, item]) => {
          map[qid] = item?.value !== undefined ? item.value : item;
        });
      }

      localQ.forEach((item) => {
        map[item.qid] = item.value;
        if (item.seq > maxSeq) maxSeq = item.seq;
        if (item.markedForReview !== undefined) {
          if (item.markedForReview) markedSet.add(item.qid);
          else markedSet.delete(item.qid);
        }
      });

      seqRef.current = maxSeq;
      if (seqKey) localStorage.setItem(seqKey, String(maxSeq));
      setQueue(localQ);
      setAnswers(map);
      setMarkedForReview(Array.from(markedSet));
    });
    return () => {
      mounted = false;
    };
  }, [attemptId, initialAnswers, initialMarked, seqKey]);

  useEffect(() => {
    if (attemptId) {
      writeQueue(attemptId, queue);
    }
  }, [queue, attemptId]);

  const flushQueue = useCallback(
    async (explicitMarked) => {
      if (!attemptId || flushingRef.current) return;
      const currentQueue = await readQueue(attemptId);
      if (currentQueue.length === 0) {
        setSyncStatus(navigator.onLine ? 'saved' : 'offline');
        return;
      }

      if (!navigator.onLine) {
        offlineBufferedRef.current = true;
        setIsOnline(false);
        setSyncStatus('offline');
        return;
      }

      flushingRef.current = true;
      setSyncStatus('saving');
      try {
        const markedSet = new Set(explicitMarked || markedForReview);
        const payload = {
          answers: currentQueue.map((item) => {
            const qType = typeMapRef.current[item.qid];
            const entry = {
              questionId: item.qid,
              markedForReview: item.markedForReview ?? markedSet.has(item.qid),
              seq: item.seq,
            };
            if (isWrittenType(qType) || (!qType && typeof item.value === 'string' && !Array.isArray(item.value))) {
              entry.text = item.value ?? '';
            } else {
              entry.selectedOptionIds = Array.isArray(item.value)
                ? item.value.filter(Boolean).map(String)
                : item.value
                ? [String(item.value)]
                : [];
            }
            return entry;
          }),
          offlineBuffered: offlineBufferedRef.current,
        };

        const res = await attemptService.saveAnswers(attemptId, payload);
        const savedIds = new Set(res.data?.saved || currentQueue.map((q) => q.qid));
        const rejectedIds = new Set((res.data?.rejected || []).map((r) => r.questionId));
        if (offlineBufferedRef.current && savedIds.size > 0) {
          setLateSyncedCount((c) => c + savedIds.size);
          offlineBufferedRef.current = false;
        }
        const sentSeqByQid = new Map(currentQueue.map((q) => [q.qid, q.seq]));
        setQueue((prev) =>
          prev.filter((item) => {
            if (savedIds.has(item.qid) || rejectedIds.has(item.qid)) {
              return item.seq > (sentSeqByQid.get(item.qid) || 0);
            }
            return true;
          })
        );
        setSyncStatus('saved');
      } catch (err) {
        if (err.isNetworkError || !navigator.onLine) {
          offlineBufferedRef.current = true;
          setIsOnline(false);
          setSyncStatus('offline');
        } else {
          setSyncStatus('error');
        }
      } finally {
        flushingRef.current = false;
      }
    },
    [attemptId, markedForReview]
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('retrying');
      flushQueue();
    };
    const handleOffline = () => {
      offlineBufferedRef.current = true;
      setIsOnline(false);
      setSyncStatus('offline');
    };
    const handleVisibility = () => {
      if (document.hidden) flushQueue();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushQueue]);

  const enqueueEntry = useCallback(
    (qid, value, markedFlag) => {
      seqRef.current += 1;
      if (seqKey) localStorage.setItem(seqKey, String(seqRef.current));

      const entry = {
        qid,
        value,
        seq: seqRef.current,
        ts: Date.now(),
        ...(markedFlag !== undefined ? { markedForReview: markedFlag } : {}),
      };

      setQueue((prev) => {
        const next = [...prev.filter((item) => item.qid !== qid), entry];
        if (attemptId) writeQueue(attemptId, next);
        return next;
      });

      if (!navigator.onLine) {
        offlineBufferedRef.current = true;
        setIsOnline(false);
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('saving');
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => {
        flushQueue();
      }, 500);
    },
    [attemptId, flushQueue, seqKey]
  );

  const enqueueAnswer = useCallback(
    (qid, value) => {
      setAnswers((prev) => ({ ...prev, [qid]: value }));
      enqueueEntry(qid, value);
    },
    [enqueueEntry]
  );

  const toggleMarkForReview = useCallback(
    (qid) => {
      setMarkedForReview((prev) => {
        const nextMarked = !prev.includes(qid);
        const next = nextMarked ? [...prev, qid] : prev.filter((id) => id !== qid);
        const qType = typeMapRef.current[qid];
        const curVal = answers[qid] ?? (isWrittenType(qType) || isSingleType(qType) ? '' : []);
        enqueueEntry(qid, curVal, nextMarked);
        return next;
      });
    },
    [answers, enqueueEntry]
  );

  const clearLocalQueue = useCallback(() => {
    clearQueue(attemptId);
    setQueue([]);
  }, [attemptId]);

  return {
    answers,
    markedForReview,
    queuedCount: queue.length,
    queuedQuestionIds: queue.map((item) => item.qid),
    isOnline,
    syncStatus,
    lateSyncedCount,
    enqueueAnswer,
    toggleMarkForReview,
    flushQueue,
    clearLocalQueue,
  };
}
