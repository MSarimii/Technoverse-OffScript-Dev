/**
 * Server-authoritative clock sync using minimum RTT from the last 5 samples.
 */
export class ServerClock {
  constructor() {
    this.samples = [];
    this.offsetMs = 0;
    this.loadPerfMs = typeof performance !== 'undefined' ? performance.now() : 0;
  }

  recordSample(serverTimeIsoOrMs, rttMs = 0) {
    const serverMs = typeof serverTimeIsoOrMs === 'number' ? serverTimeIsoOrMs : Date.parse(serverTimeIsoOrMs);
    if (Number.isNaN(serverMs)) return;

    const clientNow = Date.now();
    const offset = serverMs - (clientNow - rttMs / 2);
    this.samples.push({ offset, rttMs: Math.max(0, rttMs) });
    if (this.samples.length > 5) this.samples.shift();

    const best = this.samples.reduce((min, s) => (s.rttMs < min.rttMs ? s : min), this.samples[0]);
    this.offsetMs = best.offset;
  }

  nowMs() {
    return Date.now() + this.offsetMs;
  }

  remainingMs(deadlineAt) {
    if (!deadlineAt) return 0;
    const deadlineMs = typeof deadlineAt === 'number' ? deadlineAt : Date.parse(deadlineAt);
    return Math.max(0, deadlineMs - this.nowMs());
  }

  monotonicElapsedMs() {
    if (typeof performance === 'undefined') return 0;
    return Math.max(0, Math.round(performance.now() - this.loadPerfMs));
  }
}
