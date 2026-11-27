import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleHome } from '../context/AuthContext';
import { ArrowRight, CheckCircle2, WifiOff, ShieldCheck } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const SAVE_LOOP = [
  { label: 'Saved', tone: 'text-status-answered', sub: 'All responses synced' },
  { label: 'Offline: 2 answers kept on this device', tone: 'text-status-review', sub: 'Queue seq #14–15' },
  { label: 'Syncing...', tone: 'text-champagne-deep', sub: 'Flushing queued answers' },
  { label: 'Saved', tone: 'text-status-answered', sub: 'Late-sync accepted · Deadline unchanged' },
];

export const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const ctaRef = useRef(null);
  const [loopIdx, setLoopIdx] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [ctaOffset, setCtaOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const id = setInterval(() => {
      if (!document.hidden) {
        setLoopIdx((i) => (i + 1) % SAVE_LOOP.length);
      }
    }, 2400);
    return () => clearInterval(id);
  }, []);

  // Safe fromTo entrance: elements never get stuck at opacity: 0
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      let lenis;
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.fromTo(
          '.hero-line',
          { y: 18, opacity: 0.05 },
          { y: 0, opacity: 1, duration: 0.65, stagger: 0.07, clearProps: 'transform,opacity' }
        )
          .fromTo(
            '.hero-fade',
            { y: 12, opacity: 0.1 },
            { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, clearProps: 'transform,opacity' },
            '-=0.35'
          )
          .fromTo(
            '.hero-stage',
            { y: 16, opacity: 0.15, rotate: 1.2 },
            { y: 0, opacity: 1, rotate: 0, duration: 0.6, clearProps: 'transform,opacity' },
            '-=0.4'
          );

        Promise.all([import('gsap/ScrollTrigger'), import('lenis')]).then(([{ ScrollTrigger }, { default: Lenis }]) => {
          gsap.registerPlugin(ScrollTrigger);
          lenis = new Lenis({ duration: 1.0, smoothWheel: true });
          let rafId;
          const raf = (time) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
          };
          rafId = requestAnimationFrame(raf);

          gsap.utils.toArray('.scroll-chapter').forEach((el) => {
            gsap.fromTo(
              el,
              { y: 16, opacity: 0.85 },
              {
                y: 0,
                opacity: 1,
                duration: 0.45,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              }
            );
          });

          return () => cancelAnimationFrame(rafId);
        });
      });

      return () => {
        if (lenis) lenis.destroy();
        mm.revert();
      };
    },
    { scope: rootRef }
  );

  const handleStageMouseMove = (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 1024 || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    setParallax({ x, y });
  };

  const handleCtaMove = (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches || !ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const x = Math.max(-6, Math.min(6, (e.clientX - (rect.left + rect.width / 2)) * 0.15));
    const y = Math.max(-6, Math.min(6, (e.clientY - (rect.top + rect.height / 2)) * 0.15));
    setCtaOffset({ x, y });
  };

  const currentLoop = SAVE_LOOP[loopIdx];

  return (
    <div ref={rootRef} className="relative overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[720px] h-[380px] rounded-full blur-[110px]"
        style={{ background: 'radial-gradient(circle, rgba(197,160,89,0.12) 0%, transparent 70%)' }}
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        {/* Asymmetric Two-Column Hero (tight padding, immediate above-the-fold visibility) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center py-8 sm:py-12">
          <div className="lg:col-span-7 space-y-5">
            <p className="hero-fade eyebrow-rule font-mono text-xs uppercase tracking-[0.12em] text-champagne-deep">
              TechnoVerse 5.0 · Examination Infrastructure
            </p>
            <h1 className="font-display text-[clamp(44px,6vw,88px)] text-ink">
              <span className="block overflow-hidden">
                <span className="hero-line block">Exams that stay</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line block">
                  <em className="italic text-champagne-deep">fair</em> when everything
                </span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line block">else fails.</span>
              </span>
            </h1>
            <p className="hero-fade text-base sm:text-lg text-ink-muted max-w-[52ch] leading-relaxed">
              Server-timed attempts, answers that survive outages, and papers balanced for difficulty.
            </p>

            <div className="hero-fade flex flex-wrap items-center gap-4 pt-1">
              <Link
                ref={ctaRef}
                onMouseMove={handleCtaMove}
                onMouseLeave={() => setCtaOffset({ x: 0, y: 0 })}
                style={{ transform: `translate3d(${ctaOffset.x}px, ${ctaOffset.y}px, 0)` }}
                to={isAuthenticated ? getRoleHome(user.role) : '/login'}
                className="min-h-[48px] inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold px-6 py-3 rounded-full shadow-sm transition-transform duration-150 active:scale-[0.96]"
              >
                {isAuthenticated ? `Open ${user.role} workspace` : 'Sign in'}
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
              <Link
                to="/verify/VER-2026-SEMS-8841"
                className="min-h-[48px] inline-flex items-center gap-2 border border-line hover:border-[var(--line-strong)] bg-surface text-ink px-6 py-3 rounded-full text-sm transition-colors shadow-sm"
              >
                Verify a report
              </Link>
            </div>
          </div>

          {/* Live Product Stage */}
          <div
            ref={stageRef}
            onMouseMove={handleStageMouseMove}
            onMouseLeave={() => setParallax({ x: 0, y: 0 })}
            className="lg:col-span-5 hero-stage relative"
          >
            <div
              style={{
                transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0) rotate(-0.8deg)`,
              }}
              className="luxury-card rounded-[14px] p-5 sm:p-6 space-y-5 transition-transform duration-200 ease-out"
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-line">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-champagne-deep">
                    Live Attempt · CS-402
                  </div>
                  <div className={`text-xs font-mono mt-0.5 ${currentLoop.tone}`}>
                    {currentLoop.label}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-canvas font-mono text-xs tabular-nums text-ink">
                  <svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" fill="none" stroke="var(--line)" strokeWidth="2" />
                    <circle
                      cx="11"
                      cy="11"
                      r="8"
                      fill="none"
                      stroke="var(--champagne)"
                      strokeWidth="2"
                      strokeDasharray="50.2"
                      strokeDashoffset={loopIdx * 8}
                      transform="rotate(-90 11 11)"
                    />
                  </svg>
                  42:18
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-serif text-xl text-ink leading-snug">
                  Explain how a bounded late-sync window preserves fairness during a network outage.
                </p>
                <div className="p-3 rounded-[10px] border border-line bg-canvas text-xs text-ink-muted font-mono">
                  {currentLoop.sub} · Deadline unchanged: 11:42 AM
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-line">
                <div className="flex gap-1.5 font-mono text-[11px]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`w-7 h-7 rounded-[8px] flex items-center justify-center border ${
                        n === 4
                          ? 'border-champagne text-champagne-deep font-semibold'
                          : n < 4
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-status-answered'
                          : 'border-line text-ink-muted'
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-ink-muted">12 questions</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 absolute -bottom-5 -left-4 luxury-card rounded-full px-3.5 py-1.5 text-[11px] font-mono text-ink">
              <ShieldCheck className="w-3.5 h-3.5 text-champagne-deep" strokeWidth={1.5} />
              Verified · VER-8841
            </div>
            <div className="hidden sm:flex items-center gap-2 absolute -top-4 -right-3 luxury-card rounded-full px-3.5 py-1.5 text-[11px] font-mono text-ink">
              Paper difficulty index <strong className="text-champagne-deep">2.1 / 2.1</strong>
            </div>
          </div>
        </section>

        {/* Credibility Strip */}
        <section aria-label="System guarantees" className="mt-12 border-y border-line py-5 grid grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs text-ink-muted">
          <div className="flex items-center gap-3">
            <span className="text-champagne-deep font-semibold">01</span>
            <span>Server-authoritative time</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-champagne-deep font-semibold">02</span>
            <span>Idempotent submission</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-champagne-deep font-semibold">03</span>
            <span>Role-enforced access</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-champagne-deep font-semibold">04</span>
            <span>WCAG 2.1 AA</span>
          </div>
        </section>

        {/* Three-Chapter Story */}
        <section aria-labelledby="story-heading" className="py-16 space-y-12">
          <h2 id="story-heading" className="sr-only">How SEMS works</h2>

          <article className="scroll-chapter grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-line pb-12">
            <div className="md:col-span-6 space-y-2.5">
              <span className="font-serif text-5xl text-champagne-deep block">01</span>
              <h3 className="font-serif text-3xl sm:text-4xl text-ink">The server keeps the clock.</h3>
              <p className="text-sm sm:text-base text-ink-muted max-w-[56ch]">
                Every countdown is anchored to the server&apos;s UTC deadline via minimum-RTT offset sampling. Changing the device clock never adds a single second.
              </p>
            </div>
            <div className="md:col-span-6 grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 rounded-[14px] luxury-card">
                <div className="text-ink-muted mb-1">Your device</div>
                <div className="text-lg text-status-danger line-through tabular-nums">+30:00 drift</div>
              </div>
              <div className="p-4 rounded-[14px] luxury-card border-champagne/60">
                <div className="text-champagne-deep mb-1">Server authority</div>
                <div className="text-lg text-ink tabular-nums">42:18 steady</div>
              </div>
            </div>
          </article>

          <article className="scroll-chapter grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-line pb-12">
            <div className="md:col-span-6 space-y-2.5">
              <span className="font-serif text-5xl text-champagne-deep block">02</span>
              <h3 className="font-serif text-3xl sm:text-4xl text-ink">Answers survive outages.</h3>
              <p className="text-sm sm:text-base text-ink-muted max-w-[56ch]">
                Responses write to IndexedDB first with monotonic sequence numbers. On reconnect, queued answers flush in order within a bounded late-sync window.
              </p>
            </div>
            <div className="md:col-span-6 p-5 rounded-[14px] luxury-card font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between text-status-review">
                <span className="inline-flex items-center gap-1.5"><WifiOff className="w-3.5 h-3.5" strokeWidth={1.5} /> Outage detected</span>
                <span>Q3, Q4, Q5 queued</span>
              </div>
              <div className="flex items-center justify-between text-status-answered">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Reconnected</span>
                <span>late-sync: accepted · deadline unchanged</span>
              </div>
            </div>
          </article>

          <article className="scroll-chapter grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-6 space-y-2.5">
              <span className="font-serif text-5xl text-champagne-deep block">03</span>
              <h3 className="font-serif text-3xl sm:text-4xl text-ink">Every paper is fair.</h3>
              <p className="text-sm sm:text-base text-ink-muted max-w-[56ch]">
                Blueprint randomization draws distinct questions per candidate while locking topic and difficulty distribution across every generated paper.
              </p>
            </div>
            <div className="md:col-span-6 p-5 rounded-[14px] luxury-card space-y-2.5 font-mono text-xs">
              {['Paper A (Candidate 01)', 'Paper B (Candidate 02)', 'Paper C (Candidate 03)'].map((label) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-40 text-ink-muted truncate">{label}</span>
                  <div className="flex-1 h-2 bg-canvas rounded-full overflow-hidden">
                    <div className="h-full bg-champagne w-[72%]" />
                  </div>
                  <span className="text-champagne-deep">2.1</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Editorial Role Entry Rows */}
        <section aria-labelledby="roles-heading" className="py-12 border-t border-line">
          <p id="roles-heading" className="eyebrow-rule font-mono text-xs uppercase tracking-[0.12em] text-champagne-deep mb-5">
            Access by Role
          </p>
          <div className="divide-y divide-line border-y border-line">
            {[
              { role: 'Candidate', desc: 'Take timed examinations with offline resilience and view published transcripts.', to: '/login' },
              { role: 'Examiner', desc: 'Author question banks, launch sandboxes, monitor live attempts, grade and publish.', to: '/login' },
              { role: 'Administrator', desc: 'Provision institutional accounts, assign roles, and enforce platform governance.', to: '/login' },
              { role: 'Verify a report', desc: 'Confirm transcript authenticity publicly using a verification identifier.', to: '/verify/VER-2026-SEMS-8841' },
            ].map((item) => (
              <Link
                key={item.role}
                to={item.to}
                className="group py-4 flex items-center justify-between gap-4 hover:px-2 transition-all duration-150"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6">
                  <span className="font-serif text-2xl sm:text-3xl text-ink w-48 shrink-0">{item.role}</span>
                  <span className="text-sm text-ink-muted">{item.desc}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-champagne-deep shrink-0 transition-transform duration-150 group-hover:translate-x-1.5" strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        </section>

        {/* Closing CTA Band */}
        <section className="mt-10 rounded-[14px] luxury-card p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl text-ink mb-1.5">Ready for the examination hall.</h2>
            <p className="text-sm text-ink-muted">Sign in with your institutional credentials to enter your workspace.</p>
          </div>
          <Link
            to={isAuthenticated ? getRoleHome(user.role) : '/login'}
            className="min-h-[48px] shrink-0 inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold px-6 py-3 rounded-full shadow-sm active:scale-[0.96]"
          >
            {isAuthenticated ? 'Enter workspace' : 'Sign in'}
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </section>
      </main>

      <footer className="border-t border-line bg-surface py-6 px-4 sm:px-6 lg:px-8 text-xs font-mono text-ink-muted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SEMS — Secure Examination Management System (TechnoVerse 5.0)</span>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-ink">Sign in</Link>
            <Link to="/verify/VER-2026-SEMS-8841" className="hover:text-ink">Verify Report</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
