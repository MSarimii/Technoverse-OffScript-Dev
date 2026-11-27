import { useState, useEffect, useRef, useCallback } from 'react';
import { attemptService } from '../services/attemptService';
import { readQueue, writeQueue, clearQueue } from '../lib/offlineQueue';

export function useOfflineAnswerQueue({ attemptId, initialAnswers, initialMarked }) {
  const seqKey = attemptId ? `sems_seq_${attemptId}` : null;
  const loadPerfRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);

  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(initialMarked || []);
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [syncStatus, setSyncStatus] = useState('saved'); // saved | saving | offline | retrying | error
  const [lateSyncedCount, setLateSyncedCount] = useState(0);

  const seqRef = useRef(Number(localStorage.getItem(seqKey) || '0'));
  const flushTimerRef = useRef(null);
  const flushingRef = useRef(false);

  useEffect(() => {
    if (!attemptId) return;
    let mounted = true;
    readQueue(attemptId).then((localQ) => {
      if (!mounted) return;
      const map = {};
      Object.entries(initialAnswers || {}).forEach(([qid, item]) => {
        map[qid] = item.value;
      });
      localQ.forEach((item) => {
        map[item.qid] = item.value;
      });
      setQueue(localQ);
      setAnswers(map);
      setMarkedForReview(initialMarked || []);
    });
    return () => {
      mounted = false;
    };
  }, [attemptId, initialAnswers, initialMarked]);

  useEffect(() => {
    if (attemptId) {
      writeQueue(attemptId, queue);
    }
  }, [queue, attemptId]);

  const flushQueue = useCallback(
    async (explicitMarked) => {
      if (!attemptId || flushingRef.current) return;
      const currentQueue = await readQueue(attemptId);
      if (currentQueue.length === 0 && !explicitMarked) {
        setSyncStatus(navigator.onLine ? 'saved' : 'offline');
        return;
      }

      if (!navigator.onLine) {
        setIsOnline(false);
        setSyncStatus('offline');
        return;
      }

      flushingRef.current = true;
      setSyncStatus('saving');
      try {
        const res = await attemptService.saveAnswers(
          attemptId,
          currentQueue,
          explicitMarked || markedForReview
        );
        const accepted = new Set(res.data?.acceptedSeqs || currentQueue.map((q) => q.seq));
        const late = res.data?.lateSyncedSeqs || [];
        if (late.length > 0) {
          setLateSyncedCount((c) => c + late.length);
        }
        setQueue((prev) => prev.filter((item) => !accepted.has(item.seq)));
        setSyncStatus('saved');
      } catch (err) {
        if (err.isNetworkError || !navigator.onLine) {
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

  const enqueueAnswer = useCallback(
    (qid, value) => {
      setAnswers((prev) => ({ ...prev, [qid]: value }));
      seqRef.current += 1;
      if (seqKey) localStorage.setItem(seqKey, String(seqRef.current));

      const clientElapsedMs =
        typeof performance !== 'undefined' ? Math.max(0, Math.round(performance.now() - loadPerfRef.current)) : 0;
      const entry = { qid, value, seq: seqRef.current, clientElapsedMs, ts: Date.now() };

      setQueue((prev) => {
        const next = [...prev.filter((item) => item.qid !== qid), entry];
        if (attemptId) writeQueue(attemptId, next);
        return next;
      });

      if (!navigator.onLine) {
        setIsOnline(false);
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('saving');
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => {
        flushQueue();
      }, 600);
    },
    [attemptId, flushQueue, seqKey]
  );

  const toggleMarkForReview = useCallback(
    (qid) => {
      setMarkedForReview((prev) => {
        const next = prev.includes(qid) ? prev.filter((id) => id !== qid) : [...prev, qid];
        flushQueue(next);
        return next;
      });
    },
    [flushQueue]
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
