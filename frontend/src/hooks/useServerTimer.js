import { useState, useEffect, useRef, useCallback } from 'react';
import { ServerClock } from '../lib/serverClock';

export function formatRemaining(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export function useServerTimer({ deadlineAt, startedAt, serverTime, onExpire }) {
  const clockRef = useRef(new ServerClock());
  const expiredFiredRef = useRef(false);
  const announcedRef = useRef(new Set());
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const [remainingMs, setRemainingMs] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const syncServerTime = useCallback((newServerTime, rttMs = 0) => {
    if (newServerTime) {
      clockRef.current.recordSample(newServerTime, rttMs);
    }
  }, []);

  useEffect(() => {
    syncServerTime(serverTime, 0);
  }, [serverTime, syncServerTime]);

  useEffect(() => {
    if (!deadlineAt) return;
    expiredFiredRef.current = false;

    const tick = () => {
      const rem = clockRef.current.remainingMs(deadlineAt);
      setRemainingMs(rem);

      const remSec = Math.floor(rem / 1000);
      const thresholds = [
        [600, '10 minutes remaining'],
        [300, '5 minutes remaining'],
        [60, '1 minute remaining'],
        [10, '10 seconds remaining'],
      ];
      for (const [sec, msg] of thresholds) {
        if (remSec <= sec && remSec > sec - 2 && !announcedRef.current.has(sec)) {
          announcedRef.current.add(sec);
          setAnnouncement(msg);
        }
      }

      if (rem === 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [deadlineAt]);

  const totalDurationMs =
    deadlineAt && startedAt ? Math.max(1, Date.parse(deadlineAt) - Date.parse(startedAt)) : 1;
  const progress = Math.min(1, Math.max(0, remainingMs / totalDurationMs));

  const urgency =
    remainingMs <= 60 * 1000 ? 'critical' : remainingMs <= 10 * 60 * 1000 ? 'warning' : 'normal';

  return {
    remainingMs,
    progress,
    formatted: formatRemaining(remainingMs),
    urgency,
    announcement,
    syncServerTime,
    monotonicElapsedMs: () => clockRef.current.monotonicElapsedMs(),
  };
}
