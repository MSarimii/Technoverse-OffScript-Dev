import { useEffect, useRef, useState, useCallback } from 'react';

export function usePolling(fn, intervalMs = 4000, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [pollError, setPollError] = useState(false);
  const backoffRef = useRef(intervalMs);

  const runNow = useCallback(async () => {
    try {
      await fnRef.current();
      setLastSyncedAt(new Date());
      setPollError(false);
      backoffRef.current = intervalMs;
    } catch {
      setPollError(true);
      backoffRef.current = Math.min(15000, backoffRef.current * 2);
    }
  }, [intervalMs]);

  useEffect(() => {
    if (!enabled) return;
    let timerId;
    let cancelled = false;

    const schedule = async () => {
      if (cancelled) return;
      if (!document.hidden) {
        await runNow();
      }
      if (!cancelled) {
        timerId = setTimeout(schedule, backoffRef.current);
      }
    };

    schedule();
    const onVis = () => {
      if (!document.hidden) runNow();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, runNow]);

  return { lastSyncedAt, pollError, refresh: runNow };
}
