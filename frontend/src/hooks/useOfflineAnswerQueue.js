import { useState, useEffect, useRef, useCallback } from 'react';
import { attemptService } from '../services/attemptService';

export function useOfflineAnswerQueue({ attemptId, initialAnswers, initialMarked, startedAt }) {
  const queueKey = attemptId ? `sems_queue_${attemptId}` : null;
  const seqKey = attemptId ? `sems_seq_${attemptId}` : null;

  const [answers, setAnswers] = useState(() => {
    const map = {};
    Object.entries(initialAnswers || {}).forEach(([qid, item]) => {
      map[qid] = item.value;
    });
    return map;
  });

  const [markedForReview, setMarkedForReview] = useState(initialMarked || []);
  const [queue, setQueue] = useState(() => {
    if (!queueKey) return [];
    try {
      return JSON.parse(localStorage.getItem(queueKey) || '[]');
    } catch {
      return [];
    }
  });
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [syncStatus, setSyncStatus] = useState('saved'); // saved | saving | offline | retrying | error
  const [lateSyncedCount, setLateSyncedCount] = useState(0);

  const seqRef = useRef(Number(localStorage.getItem(seqKey) || '0'));
  const flushTimerRef = useRef(null);
  const flushingRef = useRef(false);

  // Sync initial loaded answers when attemptId arrives
  useEffect(() => {
    if (!attemptId) return;
    const map = {};
    Object.entries(initialAnswers || {}).forEach(([qid, item]) => {
      map[qid] = item.value;
    });
    // Overlay any un-flushed local queued answers so refresh preserves offline edits
    try {
      const localQ = JSON.parse(localStorage.getItem(`sems_queue_${attemptId}`) || '[]');
      localQ.forEach((item) => {
        map[item.qid] = item.value;
      });
      setQueue(localQ);
    } catch {
      // ignore
    }
    setAnswers(map);
    setMarkedForReview(initialMarked || []);
  }, [attemptId, initialAnswers, initialMarked]);

  useEffect(() => {
    if (queueKey) {
      localStorage.setItem(queueKey, JSON.stringify(queue));
    }
  }, [queue, queueKey]);

  const flushQueue = useCallback(
    async (explicitMarked) => {
      if (!attemptId || flushingRef.current) return;
      const currentQueue = JSON.parse(localStorage.getItem(`sems_queue_${attemptId}`) || '[]');
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
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue]);

  const enqueueAnswer = useCallback(
    (qid, value) => {
      setAnswers((prev) => ({ ...prev, [qid]: value }));
      seqRef.current += 1;
      if (seqKey) localStorage.setItem(seqKey, String(seqRef.current));

      const clientElapsedMs = startedAt ? Math.max(0, Date.now() - Date.parse(startedAt)) : 0;
      const entry = { qid, value, seq: seqRef.current, clientElapsedMs };

      setQueue((prev) => {
        const filtered = prev.filter((item) => item.qid !== qid);
        const next = [...filtered, entry];
        if (queueKey) localStorage.setItem(queueKey, JSON.stringify(next));
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
      }, 450);
    },
    [flushQueue, queueKey, seqKey, startedAt]
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
    if (queueKey) localStorage.removeItem(queueKey);
    if (seqKey) localStorage.removeItem(seqKey);
    setQueue([]);
  }, [queueKey, seqKey]);

  return {
    answers,
    markedForReview,
    queuedCount: queue.length,
    isOnline,
    syncStatus,
    lateSyncedCount,
    enqueueAnswer,
    toggleMarkForReview,
    flushQueue,
    clearLocalQueue,
  };
}
