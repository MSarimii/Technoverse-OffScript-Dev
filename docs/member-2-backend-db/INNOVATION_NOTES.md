# SEMS Open Innovation Architecture Notes (Judge Q&A Brief)

These two architectural innovations solve real assessment failure modes inside the core exam workflow without relying on external billing services or fragile heuristics.

---

## 1. Difficulty-Stratified Randomized Paper Fairness (Section 5.2)

### Problem
Naive randomized question selection (`shuffleQuestions` across an unstratified bank) lets Candidate A randomly draw mostly `easy` questions while Candidate B draws mostly `hard` questions—creating statistically unfair score distributions and high `paperDifficultyIndex` variance.

### Mechanism
1. **Pre-Publish Blueprint Gate** (`examService.computeReadinessChecks`): When `exam.blueprint.poolMode === true`, publishing is blocked (`409 CONFLICT`) unless the active assigned question pool contains at least the configured quota for every difficulty stratum (`easy`, `medium`, `hard`).
2. **Per-Stratum Sampling** (`paperBuilder.buildFrozenPaper`): Questions are partitioned by difficulty, Fisher-Yates shuffled *within each stratum*, sliced to `{ easy, medium, hard }`, optionally shuffled together across positions, and frozen into `Attempt.paper` alongside a SHA-256 `paperFingerprint` and weighted `paperDifficultyIndex` (`easy=1, medium=2, hard=3`).
3. **Fairness Audit Endpoint** (`GET /api/exams/:id/fairness`): Aggregates all real attempts (`isSandbox: false`) to report `uniqueFingerprints` and `difficultyIndexStats: { min, max, mean, spread }` with `fairnessStatus` (`balanced | within_tolerance | skewed`).

### Trade-Offs & Guarantees
- **Guarantee**: Every candidate receives an identical structural difficulty distribution (`spread === 0` when marks per stratum align) while maintaining unique item orders and option orders across attempts (`uniqueFingerprints > 1`).
- **Trade-Off**: Examiners must maintain at least the minimum stratum counts in the pool; total question count delivered equals `easy + medium + hard` rather than the full pool size.

---

## 2. Bounded Reconnect-Grace Resilience (Section 5.3)

### Problem
Candidates on spotty Wi-Fi may select answers locally seconds before `deadlineAt`, disconnect briefly, and reconnect 5–15 seconds *after* `deadlineAt` closes. Pure hard cutoffs drop valid pre-deadline work, while blindly extending `deadlineAt` opens timing-abuse exploits.

### Mechanism
1. **Zero Deadline Extension**: `Attempt.deadlineAt` is immutable on the server—never shifted forward on reconnect.
2. **Four-Part Cryptographic/Temporal Guard** (`attemptService.autosaveAnswers`): An autosave arriving when `now >= deadlineAt` is accepted **only** if ALL four conditions hold:
   - `offlineBuffered === true` (explicitly marked offline replay batch)
   - `now - deadlineAt <= RECONNECT_GRACE_SECONDS * 1000` (bounded window, default `30s`)
   - `startedAt <= clientSavedAt <= deadlineAt` (answer timestamped before exam expiry)
   - `lastHeartbeatAt <= deadlineAt` (no post-deadline session activity logged before replay)
3. **Atomic Immediate Finalization**: Accepted grace answers are merged via monotonic `seq` deduplication, immediately finalized (`finalizedBy: 'expiry'`), auto-graded, and returned with `{ finalizedByGrace: true, remainingMs: 0 }`. Any request failing any condition is rejected with `409 ATTEMPT_EXPIRED`.

### Trade-Offs & Guarantees
- **Guarantee**: No extra thinking time after `deadlineAt` (`finalizedByGrace` ends the attempt immediately upon delivery, cannot repeat twice, and blocks post-deadline timestamps).
- **Trade-Off**: `clientSavedAt` trusts the browser clock up to the tight upper bound of `deadlineAt`; combining that with `lastHeartbeatAt <= deadlineAt` and `RECONNECT_GRACE_SECONDS` keeps the exposure strictly bounded (30s default) and auditable.
