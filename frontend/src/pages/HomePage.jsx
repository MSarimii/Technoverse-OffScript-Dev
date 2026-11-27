import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleHome } from '../context/AuthContext';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  GraduationCap,
  ClipboardCheck,
  Building2,
  Database,
  Clock,
  Lock,
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const SAVE_LOOP = [
  { label: 'Saved', tone: 'text-status-answered', sub: 'All responses synced' },
  { label: 'Offline: 2 answers kept on this device', tone: 'text-status-review', sub: 'Queue seq #14–15' },
  { label: 'Syncing...', tone: 'text-champagne-deep', sub: 'Flushing queued answers' },
  { label: 'Saved', tone: 'text-status-answered', sub: 'Late-sync accepted · Deadline unchanged' },
];

const ROLE_CARDS = [
  {
    idx: '01',
    role: 'Candidate',
    desc: 'Take server-timed examinations with local outage resilience and view verifiable academic transcripts.',
    to: '/login',
    icon: GraduationCap,
  },
  {
    idx: '02',
    role: 'Examiner',
    desc: 'Author balanced question banks, preview sandboxes, monitor live attempts, grade and publish.',
    to: '/login',
    icon: ClipboardCheck,
  },
  {
    idx: '03',
    role: 'Administrator',
    desc: 'Provision institutional accounts, assign governance roles, and audit examination readiness.',
    to: '/login',
    icon: Building2,
  },
  {
    idx: '04',
    role: 'Verify a Report',
    desc: 'Confirm transcript authenticity publicly using an official SEMS verification identifier.',
    to: '/verify/VER-2026-SEMS-8841',
    icon: ShieldCheck,
  },
];

const PAPER_CARDS = [
  { name: 'Paper A', topics: ['DSA', 'OS', 'DB'], pct: '82%' },
  { name: 'Paper B', topics: ['OS', 'DB', 'DSA'], pct: '82%' },
  { name: 'Paper C', topics: ['DB', 'DSA', 'OS'], pct: '82%' },
];

export const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const ctaRef = useRef(null);
  const [loopIdx, setLoopIdx] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [ctaOffset, setCtaOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      if (!document.hidden) {
        setLoopIdx((i) => (i + 1) % SAVE_LOOP.length);
      }
    }, 2400);
    return () => clearInterval(id);
  }, [reduced]);

  // Safe fromTo entrance: elements are never stuck at opacity: 0
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      let lenis;
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.fromTo(
          '.hero-line',
          { y: 16, opacity: 0.1 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.07, clearProps: 'transform,opacity' }
        )
          .fromTo(
            '.hero-fade',
            { y: 10, opacity: 0.15 },
            { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, clearProps: 'transform,opacity' },
            '-=0.35'
          )
          .fromTo(
            '.hero-stage',
            { y: 14, opacity: 0.2, rotate: 1.0 },
            { y: 0, opacity: 1, rotate: 0, duration: 0.55, clearProps: 'transform,opacity' },
            '-=0.35'
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
              { y: 14, opacity: 0.88 },
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
    if (reduced || window.innerWidth < 1024 || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    setParallax({ x, y });
  };

  const handleCtaMove = (e) => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches || !ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const x = Math.max(-6, Math.min(6, (e.clientX - (rect.left + rect.width / 2)) * 0.15));
    const y = Math.max(-6, Math.min(6, (e.clientY - (rect.top + rect.height / 2)) * 0.15));
    setCtaOffset({ x, y });
  };

  const currentLoop = SAVE_LOOP[loopIdx];

  return (
    <div ref={rootRef} className="relative overflow-x-hidden">
      {/* Faint architectural background wash (5-7% emerald/brass glow + hairline grid fading at edges) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 65% 50% at 25% 15%, rgba(25, 103, 77, 0.065) 0%, transparent 70%),
            radial-gradient(ellipse 55% 45% at 78% 20%, rgba(197, 160, 89, 0.065) 0%, transparent 70%),
            linear-gradient(to right, rgba(19, 78, 58, 0.045) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(19, 78, 58, 0.045) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 64px 64px, 64px 64px',
          maskImage: 'radial-gradient(ellipse 85% 80% at 50% 25%, black 35%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 80% at 50% 25%, black 35%, transparent 100%)',
        }}
      />

      <main className="relative">
        {/* Asymmetric Two-Column Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-12 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <p className="hero-fade eyebrow-rule font-mono text-xs uppercase tracking-[0.12em] text-champagne-deep">
                TechnoVerse 5.0 · Examination Infrastructure
              </p>
              <h1 className="font-display text-[clamp(44px,6vw,84px)] text-ink">
                <span className="block overflow-hidden">
                  <span className="hero-line block">Exams that stay</span>
                </span>
                <span className="block overflow-hidden">
                  <span className="hero-line block">
                    <em className="italic text-[#19674D]">fair</em> when everything
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
                  className="group relative overflow-hidden min-h-[48px] inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow-[0_6px_20px_rgba(25,103,77,0.28)] transition-all duration-150 active:scale-[0.96]"
                >
                  {!reduced && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-2">
                    {isAuthenticated ? `Open ${user.role} workspace` : 'Sign in'}
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                </Link>
                <Link
                  to="/verify/VER-2026-SEMS-8841"
                  className="min-h-[48px] inline-flex items-center gap-2 border border-line hover:border-champagne bg-surface text-ink px-6 py-3 rounded-full text-sm transition-all duration-150 shadow-sm hover:-translate-y-[1px]"
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
                className="luxury-card card-top-emerald rounded-[14px] p-5 sm:p-6 space-y-5 transition-transform duration-200 ease-out"
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
                        stroke="var(--accent)"
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
                            ? 'border-champagne bg-[#E6F3EE] text-[#134E3A] font-semibold'
                            : n < 4
                            ? 'bg-[#E6F3EE] border-[#19674D]/35 text-[#19674D]'
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
                <ShieldCheck className="w-3.5 h-3.5 text-[#19674D]" strokeWidth={1.5} />
                Verified · VER-8841
              </div>
              <div className="hidden sm:flex items-center gap-2 absolute -top-4 -right-3 luxury-card rounded-full px-3.5 py-1.5 text-[11px] font-mono text-ink">
                Paper difficulty index <strong className="text-[#19674D]">2.10 / 2.10</strong>
              </div>
            </div>
          </div>

          {/* Credibility Strip */}
          <section aria-label="System guarantees" className="mt-14 border-y border-line py-5 grid grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs text-ink-muted">
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
        </section>

        {/* Full-Bleed Heritage Emerald Band: 3-Chapter Feature Showcase */}
        <section
          aria-labelledby="story-heading"
          className="bg-[#134E3A] text-[#F7F5F0] py-16 sm:py-20 border-y border-[#C5A059]/25"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#F7F5F0]/15 pb-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#C5A059]">
                  Architectural Guarantees
                </p>
                <h2 id="story-heading" className="font-serif text-3xl sm:text-5xl text-[#F7F5F0] mt-1">
                  How SEMS keeps exams fair and resilient.
                </h2>
              </div>
              <span className="text-xs font-mono text-[#B2C9BF] uppercase tracking-[0.1em]">
                01 — 03 · Verified Mechanics
              </span>
            </div>

            {/* Chapter 01: Server keeps the clock */}
            <article className="scroll-chapter grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-12 border-b border-[#C5A059]/25">
              <div className="lg:col-span-5 space-y-3">
                <span className="font-serif text-5xl text-[#C5A059] block">01</span>
                <h3 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0]">The server keeps the clock.</h3>
                <p className="text-sm sm:text-base text-[#D7E6DF] max-w-[54ch] leading-relaxed">
                  Every countdown is anchored to the server&apos;s UTC deadline via minimum-RTT offset sampling. Changing the local device clock never adds a single second.
                </p>
              </div>
              <div
                className="lg:col-span-7 min-h-[240px] rounded-[16px] p-5 sm:p-6 flex flex-col justify-between gap-5"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(197, 160, 89, 0.28)',
                  backgroundImage: 'radial-gradient(rgba(247, 245, 240, 0.14) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.1em] text-[#B2C9BF]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C5A059]" /> Clock Authority Comparison
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#19674D] border border-[#C5A059]/40 text-[#F7F5F0]">
                    RTT Offset: 14ms · Locked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dimmed Tampered Device Clock */}
                  <div className="rounded-[12px] p-4 bg-black/20 border border-white/10 opacity-65">
                    <div className="text-[11px] font-mono uppercase text-[#B2C9BF] mb-1">Local Device Clock</div>
                    <div className="font-mono text-xl text-red-300 line-through tabular-nums">12:12:00 (+30m Tampered)</div>
                    <div className="text-[11px] font-mono text-red-200/80 mt-2">Ignored by submission gate</div>
                  </div>

                  {/* Luminous Authoritative UTC Server Clock */}
                  <div className="rounded-[12px] p-4 bg-[#0F2E23]/90 border border-[#C5A059]/60 shadow-lg flex items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono uppercase text-[#C5A059] mb-1">
                        <Lock className="w-3 h-3" /> Authoritative UTC Server Clock
                      </div>
                      <div className="font-mono text-2xl text-[#F7F5F0] font-semibold tabular-nums">42:18</div>
                      <div className="text-[11px] font-mono text-[#B2C9BF] mt-1">Deadline: 11:42:00 UTC</div>
                    </div>
                    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className="shrink-0">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(247,245,240,0.18)" strokeWidth="4" />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        fill="none"
                        stroke="#C5A059"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="138.2"
                        strokeDashoffset={28 + loopIdx * 6}
                        transform="rotate(-90 28 28)"
                        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </article>

            {/* Chapter 02: Answers survive outages */}
            <article className="scroll-chapter grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-12 border-b border-[#C5A059]/25">
              <div className="lg:col-span-5 space-y-3">
                <span className="font-serif text-5xl text-[#C5A059] block">02</span>
                <h3 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0]">Answers survive outages.</h3>
                <p className="text-sm sm:text-base text-[#D7E6DF] max-w-[54ch] leading-relaxed">
                  Responses write to IndexedDB first with monotonic sequence numbers. On reconnect, queued answers flush in order within a bounded late-sync window.
                </p>
              </div>
              <div
                className="lg:col-span-7 min-h-[240px] rounded-[16px] p-5 sm:p-6 flex flex-col justify-between gap-5"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(197, 160, 89, 0.28)',
                  backgroundImage: 'radial-gradient(rgba(247, 245, 240, 0.14) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.1em] text-[#B2C9BF]">
                  <span className="inline-flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#C5A059]" /> Offline-First Sync Pipeline
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[#F7F5F0]">
                    Monotonic Seq · Idempotent
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Step 1: IndexedDB Local Vault */}
                  <div className="rounded-[12px] p-3.5 bg-[#0F2E23]/85 border border-white/15 space-y-2">
                    <div className="text-[11px] font-mono uppercase text-[#C5A059]">IndexedDB Local Vault</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Q3 · #14', 'Q4 · #15', 'Q5 · #16'].map((chip) => (
                        <span
                          key={chip}
                          className="px-2 py-1 rounded-md bg-white/10 border border-[#C5A059]/35 font-mono text-[11px] text-[#F7F5F0]"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Animated dashed brass sync connector */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="w-full flex items-center gap-2">
                      <span className="h-[2px] flex-1 border-t-2 border-dashed border-[#C5A059]" />
                      <span className="px-2.5 py-1 rounded-full bg-[#C5A059] text-[#134E3A] font-mono text-[10px] font-semibold uppercase">
                        Flush
                      </span>
                      <span className="h-[2px] flex-1 border-t-2 border-dashed border-[#C5A059]" />
                    </div>
                    <span className="text-[10px] font-mono text-[#B2C9BF] mt-1.5">Bounded late-sync</span>
                  </div>

                  {/* Step 3: Server Ledger */}
                  <div className="rounded-[12px] p-3.5 bg-[#0F2E23]/95 border border-[#C5A059]/60 space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#C5A059]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" /> Server Ledger
                    </div>
                    <div className="text-xs font-mono text-[#F7F5F0] font-medium">
                      Accepted · Deadline Unchanged
                    </div>
                    <div className="text-[11px] font-mono text-[#B2C9BF]">3/3 responses committed</div>
                  </div>
                </div>
              </div>
            </article>

            {/* Chapter 03: Every paper is fair */}
            <article className="scroll-chapter grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-3">
                <span className="font-serif text-5xl text-[#C5A059] block">03</span>
                <h3 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0]">Every paper is fair.</h3>
                <p className="text-sm sm:text-base text-[#D7E6DF] max-w-[54ch] leading-relaxed">
                  Blueprint randomization draws distinct questions per candidate while locking topic and difficulty distribution across every generated paper.
                </p>
              </div>
              <div
                className="lg:col-span-7 min-h-[240px] rounded-[16px] p-5 sm:p-6 flex flex-col justify-between gap-5"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(197, 160, 89, 0.28)',
                  backgroundImage: 'radial-gradient(rgba(247, 245, 240, 0.14) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.1em] text-[#B2C9BF]">
                  <span>Blueprint Parity Matrix</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#19674D] border border-[#C5A059]/40 text-[#F7F5F0]">
                    Variance: 0.00 · Balanced
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PAPER_CARDS.map((paper) => (
                    <div
                      key={paper.name}
                      className="rounded-[12px] p-3.5 bg-[#0F2E23]/90 border border-white/15 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-lg text-[#F7F5F0]">{paper.name}</span>
                        <span className="font-mono text-xs text-[#C5A059] font-semibold tabular-nums">2.10</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {paper.topics.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-[#D7E6DF]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-[#C5A059] rounded-full" style={{ width: paper.pct }} />
                        </div>
                        <div className="text-[10px] font-mono text-[#B2C9BF]">Difficulty Index</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* 2x2 Editorial Role Card Grid */}
        <section aria-labelledby="roles-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="mb-8">
            <p id="roles-heading" className="eyebrow-rule font-mono text-xs uppercase tracking-[0.12em] text-champagne-deep">
              Access by Role
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-ink mt-2">
              Dedicated portals for every participant.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ROLE_CARDS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.role}
                  whileHover={reduced ? undefined : { y: -3 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                >
                  <Link
                    to={item.to}
                    className="group luxury-card hover:border-champagne rounded-[14px] p-7 flex flex-col justify-between min-h-[210px] transition-colors duration-150"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <span className="w-11 h-11 rounded-[12px] bg-[#E6F3EE] text-[#134E3A] flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" strokeWidth={1.5} />
                        </span>
                        <span className="font-serif text-2xl text-champagne-deep tabular-nums">{item.idx}</span>
                      </div>
                      <h3 className="font-serif text-2xl sm:text-3xl text-ink mb-2">{item.role}</h3>
                      <p className="text-sm text-ink-muted leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-line flex items-center justify-end">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.08em] text-[#19674D] font-semibold">
                        Enter Portal
                        <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" strokeWidth={1.5} />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Closing CTA Band */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-[14px] luxury-card card-top-brass p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl text-ink mb-1.5">Ready for the examination hall.</h2>
              <p className="text-sm text-ink-muted">Sign in with your institutional credentials to enter your workspace.</p>
            </div>
            <Link
              to={isAuthenticated ? getRoleHome(user.role) : '/login'}
              className="group relative overflow-hidden min-h-[48px] shrink-0 inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold px-6 py-3 rounded-full shadow-sm active:scale-[0.96] transition-all"
            >
              {!reduced && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-2">
                {isAuthenticated ? 'Enter workspace' : 'Sign in'}
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </span>
            </Link>
          </div>
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
