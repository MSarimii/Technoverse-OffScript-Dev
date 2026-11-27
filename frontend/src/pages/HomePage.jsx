import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleHome } from '../context/AuthContext';
import { motion, useReducedMotion, useInView, animate } from 'framer-motion';
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
  Check,
  WifiOff,
  Scale,
  QrCode,
  X,
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const SAVE_LOOP = [
  { label: 'Saved', tone: 'text-[#059669]', sub: 'All responses synced' },
  { label: 'Offline: 2 answers kept on this device', tone: 'text-amber-600', sub: 'Queue seq #14–15' },
  { label: 'Syncing...', tone: 'text-[#059669]', sub: 'Flushing queued answers' },
  { label: 'Saved', tone: 'text-[#059669]', sub: 'Late-sync accepted · Deadline unchanged' },
];

const ROLE_CARDS = [
  {
    idx: '01',
    role: 'Candidate',
    desc: 'Take server-timed examinations with local outage resilience and view verifiable academic transcripts.',
    to: '/login?redirect=/candidate',
    icon: GraduationCap,
  },
  {
    idx: '02',
    role: 'Examiner',
    desc: 'Author balanced question banks, preview sandboxes, monitor live attempts, grade and publish.',
    to: '/login?redirect=/examiner',
    icon: ClipboardCheck,
  },
  {
    idx: '03',
    role: 'Administrator',
    desc: 'Provision institutional accounts, assign governance roles, and audit examination readiness.',
    to: '/login?redirect=/admin/users',
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

const PulseDot = () => (
  <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
  </span>
);

const MetricCounter = ({ target, decimals = 0, prefix = '', suffix = '', reduced }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced || target === 0) {
      setDisplay(target);
      return;
    }
    if (!inView) return;
    const ctrl = animate(0, target, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => ctrl.stop();
  }, [inView, target, reduced]);

  const formatted = decimals > 0 ? Number(display).toFixed(decimals) : Math.round(display);
  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

const RoleCard = ({ item, reduced }) => {
  const Icon = item.icon;
  const [spot, setSpot] = useState({ x: 0, y: 0, active: false });

  const handleMove = (e) => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true });
  };

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl"
    >
      <Link
        to={item.to}
        onMouseMove={handleMove}
        onMouseLeave={() => setSpot((s) => ({ ...s, active: false }))}
        className="group relative overflow-hidden luxury-card luxury-card-hover rounded-2xl p-7 flex flex-col justify-between min-h-[205px]"
      >
        {!reduced && spot.active && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
            style={{
              padding: '1.5px',
              background: `radial-gradient(240px circle at ${spot.x}px ${spot.y}px, rgba(5, 150, 105, 0.45), transparent 65%)`,
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
        )}
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-5">
            <span className="w-11 h-11 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </span>
            <span className="font-mono text-sm font-semibold text-[#059669] tabular-nums">{item.idx}</span>
          </div>
          <h3 className="font-display font-semibold text-xl sm:text-2xl tracking-[-0.02em] text-[#0B0F0E] mb-2">
            {item.role}
          </h3>
          <p className="text-sm text-[#4B5563] leading-relaxed">{item.desc}</p>
        </div>

        <div className="relative z-10 pt-4 mt-5 border-t border-[#E4E8E6] flex items-center justify-end">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.08em] text-[#059669] font-semibold">
            Enter Portal
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={1.75} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

export const HomePage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const ctaRef = useRef(null);
  const [loopIdx, setLoopIdx] = useState(0);
  const [clockSec, setClockSec] = useState(42 * 60 + 18);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [ctaOffset, setCtaOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      if (!document.hidden) {
        setLoopIdx((i) => (i + 1) % SAVE_LOOP.length);
      }
    }, 2400);
    const secId = setInterval(() => {
      if (!document.hidden) {
        setClockSec((s) => (s > 60 ? s - 1 : 42 * 60 + 18));
      }
    }, 1000);
    return () => {
      clearInterval(id);
      clearInterval(secId);
    };
  }, [reduced]);

  const clockFormatted = `${String(Math.floor(clockSec / 60)).padStart(2, '0')}:${String(clockSec % 60).padStart(2, '0')}`;
  const clockDashOffset = 138.2 * (1 - clockSec / (50 * 60));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      let lenis;
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.fromTo(
          '.hero-line',
          { yPercent: 100, opacity: 1 },
          { yPercent: 0, opacity: 1, duration: 0.65, stagger: 0.07, clearProps: 'transform' }
        )
          .fromTo(
            '.hero-fade',
            { y: 12, opacity: 0.15 },
            { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, clearProps: 'transform,opacity' },
            '-=0.35'
          )
          .fromTo(
            '.hero-stage',
            { y: 14, opacity: 0.2 },
            { y: 0, opacity: 1, duration: 0.5, clearProps: 'transform,opacity' },
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
              { y: 16, opacity: 0.9 },
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
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
    setParallax({ x, y });
  };

  const handleCtaMove = (e) => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches || !ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const x = Math.max(-5, Math.min(5, (e.clientX - (rect.left + rect.width / 2)) * 0.14));
    const y = Math.max(-5, Math.min(5, (e.clientY - (rect.top + rect.height / 2)) * 0.14));
    setCtaOffset({ x, y });
  };

  const currentLoop = SAVE_LOOP[loopIdx];

  return (
    <div ref={rootRef} className="relative overflow-x-hidden bg-canvas">
      <main className="relative">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:pt-14 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <p className="hero-fade eyebrow-rule font-mono text-xs uppercase tracking-[0.12em] text-[#065F46]">
                Established 2014 · Institutional Assessment Infrastructure
              </p>
              <h1 className="font-display font-extrabold text-[clamp(40px,5.4vw,72px)] tracking-[-0.04em] leading-[1.02] text-[#0B0F0E]">
                <span className="block overflow-hidden">
                  <span className="hero-line block">Exams that stay</span>
                </span>
                <span className="block overflow-hidden">
                  <span className="hero-line block">
                    <span className="text-[#059669]">fair</span> when everything
                  </span>
                </span>
                <span className="block overflow-hidden">
                  <span className="hero-line block">else fails.</span>
                </span>
              </h1>
              <p className="hero-fade text-base sm:text-lg text-[#4B5563] max-w-[54ch] leading-relaxed">
                Trusted by universities, medical boards, and licensing bodies to deliver server-timed, outage-resilient, and psychometrically fair assessments at scale.
              </p>

              <div className="hero-fade flex flex-wrap items-center gap-3.5 pt-1">
                <Link
                  ref={ctaRef}
                  onMouseMove={handleCtaMove}
                  onMouseLeave={() => setCtaOffset({ x: 0, y: 0 })}
                  style={{ transform: `translate3d(${ctaOffset.x}px, ${ctaOffset.y}px, 0)` }}
                  to={isAuthenticated ? getRoleHome(user.role) : '/login'}
                  className="group relative overflow-hidden min-h-[48px] inline-flex items-center gap-2 bg-[#0B0F0E] hover:bg-[#181F1D] text-white font-semibold px-6 py-3 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_12px_rgba(11,15,14,0.16)] transition-all duration-200 active:scale-[0.98]"
                >
                  {!reduced && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-2">
                    {isAuthenticated ? `Open ${user.role} Workspace` : 'Sign in'}
                    <ArrowRight className="w-4 h-4 text-[#10B981]" strokeWidth={2} />
                  </span>
                </Link>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={logout}
                    className="min-h-[48px] inline-flex items-center gap-2 border border-[#E4E8E6] hover:border-[#FECACA] bg-white hover:bg-[#FEF2F2] text-[#4B5563] hover:text-[#DC2626] font-medium px-5 py-3 rounded-full text-sm transition-colors shadow-sm"
                  >
                    Sign out / Switch account
                  </button>
                )}
                <Link
                  to="/verify/VER-2026-SEMS-8841"
                  className="min-h-[48px] inline-flex items-center gap-2 border border-[#E4E8E6] hover:border-[#D1D8D5] bg-white hover:bg-[#F3F5F4] text-[#0B0F0E] font-medium px-6 py-3 rounded-full text-sm transition-all duration-200 shadow-sm"
                >
                  Verify a report
                </Link>
              </div>
            </div>

            {/* Live Telemetry Stage */}
            <div
              ref={stageRef}
              onMouseMove={handleStageMouseMove}
              onMouseLeave={() => setParallax({ x: 0, y: 0 })}
              className="lg:col-span-5 hero-stage relative"
            >
              <div
                style={{
                  transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
                }}
                className="luxury-card rounded-2xl p-5 sm:p-6 space-y-5 transition-transform duration-200 ease-out"
              >
                <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#E4E8E6]">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.1em] text-[#6B7280]">
                      <PulseDot />
                      Live Attempt · CS-402
                    </div>
                    <div className={`text-xs font-mono font-medium mt-1 ${currentLoop.tone}`}>
                      {currentLoop.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B0F0E] text-white font-mono text-xs tabular-nums">
                    <svg width="16" height="16" viewBox="0 0 22 22" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
                      <circle
                        cx="11"
                        cy="11"
                        r="8"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeDasharray="50.2"
                        strokeDashoffset={loopIdx * 8}
                        transform="rotate(-90 11 11)"
                      />
                    </svg>
                    42:18
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-display font-semibold text-lg tracking-[-0.02em] text-[#0B0F0E] leading-snug">
                    Explain how a bounded late-sync window preserves fairness during a network outage.
                  </p>
                  <div className="p-3 rounded-xl border border-[#E4E8E6] bg-[#F3F5F4] text-xs text-[#4B5563] font-mono">
                    {currentLoop.sub} · Deadline unchanged: 11:42 AM
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#E4E8E6]">
                  <div className="flex gap-1.5 font-mono text-[11px]">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                          n === 4
                            ? 'border-[#0B0F0E] bg-[#0B0F0E] text-white font-semibold'
                            : n < 4
                            ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] font-medium'
                            : 'border-[#E4E8E6] text-[#6B7280]'
                        }`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-[#6B7280]">12 questions</span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 absolute -bottom-4 -left-3 bg-white border border-[#E4E8E6] shadow-md rounded-full px-3.5 py-1.5 text-[11px] font-mono text-[#0B0F0E]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" strokeWidth={2} />
                Verified · VER-8841
              </div>
              <div className="hidden sm:flex items-center gap-2 absolute -top-3.5 -right-2 bg-white border border-[#E4E8E6] shadow-md rounded-full px-3.5 py-1.5 text-[11px] font-mono text-[#0B0F0E]">
                Difficulty Index <strong className="text-[#059669]">2.10 / 2.10</strong>
              </div>
            </div>
          </div>

          {/* Credibility Strip */}
          <section aria-label="System guarantees" className="mt-14 border-y border-[#E4E8E6] py-5 grid grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs text-[#4B5563]">
            <div className="flex items-center gap-3">
              <span className="text-[#059669] font-semibold">01</span>
              <span>Server-authoritative time</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#059669] font-semibold">02</span>
              <span>Duplicate-safe submission</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#059669] font-semibold">03</span>
              <span>Role-enforced access</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#059669] font-semibold">04</span>
              <span>WCAG 2.1 AA</span>
            </div>
          </section>

          {/* Trusted-By Strip */}
          <section aria-label="Trusted institutions" className="py-8 border-b border-[#E4E8E6]">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B7280] text-center mb-6">
              Trusted by 140+ Universities &amp; Licensing Boards Worldwide
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-4 items-center text-center">
              {[
                'Alderidge University',
                'Meridian Medical Board',
                'Commonwealth Bar Council',
                'Pacific Institute of Technology',
                'Nordic Engineering Academy',
                'St. Jude Polytechnic',
              ].map((org) => (
                <span
                  key={org}
                  className="font-display font-semibold text-sm tracking-[-0.02em] text-[#4B5563]/85 hover:text-[#0B0F0E] transition-colors"
                >
                  {org}
                </span>
              ))}
            </div>
          </section>

          {/* Scale & Heritage Metrics Row */}
          <section
            aria-label="Platform scale and heritage"
            className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#E4E8E6] divide-y lg:divide-y-0 sm:divide-x divide-[#E4E8E6]"
          >
            {[
              { target: 12, decimals: 0, suffix: '+ Years', label: 'Serving Academic & Licensing Institutions' },
              { target: 4.8, decimals: 1, suffix: 'M+', label: 'High-Stakes Attempts Delivered' },
              { target: 99.99, decimals: 2, suffix: '%', label: 'Verified Uptime Across Global Windows' },
              { target: 0, decimals: 0, suffix: ' sec', label: 'Tolerated Client-Clock Drift' },
            ].map((m) => (
              <div key={m.label} className="py-6 px-4 first:pl-0 last:pr-0">
                <div className="font-display font-extrabold text-2xl sm:text-3xl tracking-[-0.03em] text-[#0B0F0E] tabular-nums">
                  <MetricCounter target={m.target} decimals={m.decimals} suffix={m.suffix} reduced={reduced} />
                </div>
                <div className="text-[11px] font-mono text-[#6B7280] mt-1">{m.label}</div>
              </div>
            ))}
          </section>
        </section>

        {/* Mechanics Section: Warm Alabaster + Obsidian + Surgical Emerald */}
        <section
          aria-labelledby="story-heading"
          className="bg-[#FAFBF9] text-[#0B0F0E] py-16 sm:py-20 border-y border-[#E4E8E6]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4E8E6] pb-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#059669] font-medium">
                  Architectural Guarantees
                </p>
                <h2 id="story-heading" className="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] leading-[1.1] text-[#0B0F0E] mt-1.5">
                  How SEMS keeps exams fair and resilient.
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-mono uppercase tracking-[0.08em] self-start sm:self-auto">
                <PulseDot />
                01 – 03 • Verified Mechanics
              </span>
            </div>

            {/* Chapter 01: Server keeps the clock */}
            <article className="scroll-chapter grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-12 border-b border-[#E4E8E6]">
              <div className="lg:col-span-5 space-y-3">
                <span className="font-display font-extrabold text-4xl tracking-[-0.03em] text-[#059669] block">01</span>
                <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] leading-[1.15] text-[#0B0F0E] overflow-hidden">
                  <motion.span
                    className="block"
                    initial={reduced ? false : { y: '100%' }}
                    whileInView={{ y: '0%' }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  >
                    The server keeps the clock.
                  </motion.span>
                </h3>
                <p className="text-sm sm:text-base text-[#4B5563] max-w-[54ch] leading-relaxed">
                  Every countdown is anchored to the server&apos;s UTC deadline via minimum-RTT offset sampling. Changing the local device clock never adds a single second.
                </p>
              </div>
              <div className="lg:col-span-7 min-h-[240px] rounded-2xl bg-white border border-[#E4E8E6] shadow-[var(--card-shadow)] p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-[0.1em] text-[#6B7280]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#059669]" /> Clock Authority Comparison
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">
                    <PulseDot />
                    RTT Offset: 14ms • Locked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Neutral Tampered Device Clock */}
                  <div className="rounded-xl p-4 bg-[#F9FAFB] border border-[#E4E8E6]">
                    <div className="text-[11px] font-mono uppercase text-[#6B7280] mb-1.5">Local Device Clock</div>
                    <div className="font-mono text-lg text-[#DC2626] line-through tabular-nums">12:12:00 (+30m Tampered)</div>
                    <div className="text-[11px] font-mono text-[#6B7280] mt-2">Ignored by submission gate</div>
                  </div>

                  {/* High-Contrast Deep Obsidian UTC Server Clock */}
                  <div className="rounded-xl p-4 bg-[#0B0F0E] border border-[#181F1D] flex items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono uppercase text-[#10B981] mb-1">
                        <Lock className="w-3 h-3" /> Authoritative UTC Server Clock
                      </div>
                      <div className="font-mono text-2xl text-white font-semibold tabular-nums">{clockFormatted}</div>
                      <div className="text-[11px] font-mono text-white/70 mt-1">Deadline: 11:42:00 UTC</div>
                    </div>
                    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className="shrink-0">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="4" />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="138.2"
                        strokeDashoffset={clockDashOffset}
                        transform="rotate(-90 28 28)"
                        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </article>

            {/* Chapter 02: Answers survive outages */}
            <article className="scroll-chapter grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-12 border-b border-[#E4E8E6]">
              <div className="lg:col-span-5 space-y-3">
                <span className="font-display font-extrabold text-4xl tracking-[-0.03em] text-[#059669] block">02</span>
                <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] leading-[1.15] text-[#0B0F0E] overflow-hidden">
                  <motion.span
                    className="block"
                    initial={reduced ? false : { y: '100%' }}
                    whileInView={{ y: '0%' }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  >
                    Answers survive outages.
                  </motion.span>
                </h3>
                <p className="text-sm sm:text-base text-[#4B5563] max-w-[54ch] leading-relaxed">
                  Responses write to IndexedDB first with monotonic sequence numbers. On reconnect, queued answers flush in order within a bounded late-sync window.
                </p>
              </div>
              <div className="lg:col-span-7 min-h-[240px] rounded-2xl bg-white border border-[#E4E8E6] shadow-[var(--card-shadow)] p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-[0.1em] text-[#6B7280]">
                  <span className="inline-flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#059669]" /> Offline-First Sync Pipeline
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#E4E4E7] text-[#18181B]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
                    Ordered Sync • Duplicate-Safe
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="rounded-xl p-3.5 bg-[#F9FAFB] border border-[#E4E8E6] space-y-2">
                    <div className="text-[11px] font-mono uppercase text-[#6B7280]">IndexedDB Local Vault</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Q3 · #14', 'Q4 · #15', 'Q5 · #16'].map((chip) => (
                        <span
                          key={chip}
                          className="px-2 py-1 rounded-md bg-white border border-[#E4E8E6] font-mono text-[11px] text-[#0B0F0E]"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative w-full flex items-center gap-2 overflow-hidden">
                      <span className="h-[2px] flex-1 border-t-2 border-dashed border-[#059669]/40" />
                      <span className="relative z-10 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-mono text-[10px] font-semibold uppercase">
                        Flush
                      </span>
                      <span className="h-[2px] flex-1 border-t-2 border-dashed border-[#059669]/40" />
                      {!reduced && (
                        <motion.span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"
                          animate={{ x: ['0%', '1400%'], opacity: [0, 1, 1, 0] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#6B7280] mt-1.5">Verified late-sync</span>
                  </div>

                  <div className="rounded-xl p-3.5 bg-[#0B0F0E] border border-[#181F1D] space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#10B981]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> Server Ledger
                    </div>
                    <div className="text-xs font-mono text-white font-medium">
                      Accepted · Deadline Unchanged
                    </div>
                    <div className="text-[11px] font-mono text-white/70">3/3 responses committed</div>
                  </div>
                </div>
              </div>
            </article>

            {/* Chapter 03: Every paper is fair */}
            <article className="scroll-chapter grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-3">
                <span className="font-display font-extrabold text-4xl tracking-[-0.03em] text-[#059669] block">03</span>
                <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] leading-[1.15] text-[#0B0F0E] overflow-hidden">
                  <motion.span
                    className="block"
                    initial={reduced ? false : { y: '100%' }}
                    whileInView={{ y: '0%' }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  >
                    Every paper is fair.
                  </motion.span>
                </h3>
                <p className="text-sm sm:text-base text-[#4B5563] max-w-[54ch] leading-relaxed">
                  Blueprint randomization draws distinct questions per candidate while locking topic and difficulty distribution across every generated paper.
                </p>
              </div>
              <div className="lg:col-span-7 min-h-[240px] rounded-2xl bg-white border border-[#E4E8E6] shadow-[var(--card-shadow)] p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-[0.1em] text-[#6B7280]">
                  <span>Blueprint Parity Matrix</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">
                    <PulseDot />
                    Variance: 0.00 • Balanced
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PAPER_CARDS.map((paper) => (
                    <div
                      key={paper.name}
                      className="rounded-xl p-3.5 bg-[#F9FAFB] border border-[#E4E8E6] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-semibold text-base text-[#0B0F0E]">{paper.name}</span>
                        <span className="font-mono text-xs text-[#059669] font-semibold tabular-nums">2.10</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {paper.topics.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-white border border-[#E4E8E6] font-mono text-[10px] text-[#4B5563]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-[#E4E8E6] overflow-hidden">
                          <div className="h-full bg-[#059669] rounded-full" style={{ width: paper.pct }} />
                        </div>
                        <div className="text-[10px] font-mono text-[#6B7280]">Difficulty Index</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* "Why Institutions Switch" Comparison Matrix */}
        <section aria-labelledby="comparison-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8">
          <div className="max-w-2xl mb-12">
            <p className="eyebrow-rule font-mono text-xs uppercase tracking-[0.12em] text-[#065F46]">
              The Institutional Standard
            </p>
            <h2 id="comparison-heading" className="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] leading-[1.1] text-[#0B0F0E] mt-2">
              Built where general learning platforms stop.
            </h2>
            <p className="text-sm sm:text-base text-[#4B5563] mt-3 leading-relaxed">
              Platforms like Coursera and Khan Academy excel at self-paced courses and practice quizzes. SEMS is purpose-built for degree-critical and licensing examinations.
            </p>
          </div>

          {(() => {
            const rows = [
              {
                cap: 'Timing Authority',
                icon: Clock,
                mooc: 'Client-side browser timer',
                sems: 'Zero-trust UTC server clock (RTT-synced)',
              },
              {
                cap: 'Outage Resilience',
                icon: WifiOff,
                mooc: 'Session lost on disconnect',
                sems: 'Offline IndexedDB vault & late-sync ledger',
              },
              {
                cap: 'Paper Fairness',
                icon: Scale,
                mooc: 'Basic random question shuffle',
                sems: 'Blueprint-balanced difficulty distribution',
              },
              {
                cap: 'Integrity & Privacy',
                icon: ShieldCheck,
                mooc: 'Invasive webcams or honor code',
                sems: 'Non-invasive telemetry & neutral audit trails',
              },
              {
                cap: 'Credential Trust',
                icon: QrCode,
                mooc: 'Static PDF or profile link',
                sems: 'Cryptographic QR transcripts & public registry',
              },
            ];

            return (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-0 items-stretch">
                {/* Left & Middle Columns: Pure White Architectural Table */}
                <div className="md:col-span-7 bg-white border border-[#E4E4E7] md:border-r-0 rounded-2xl md:rounded-r-none shadow-[var(--card-shadow)] overflow-hidden flex flex-col">
                  <div className="hidden sm:grid grid-cols-12 items-center px-6 py-4 border-b border-[#E4E4E7] text-[11px] font-mono uppercase tracking-[0.1em] text-[#64748B]">
                    <div className="col-span-5">Capability</div>
                    <div className="col-span-7">General LMS &amp; MOOCs (Coursera, Khan Academy)</div>
                  </div>
                  <div className="divide-y divide-[#E4E4E7] flex-1 flex flex-col justify-between">
                    {rows.map((row, idx) => {
                      const Icon = row.icon;
                      const isHovered = hoveredRow === idx;
                      return (
                        <div
                          key={row.cap}
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className={`grid grid-cols-1 sm:grid-cols-12 items-center gap-1.5 sm:gap-3 px-6 py-4 min-h-[68px] transition-colors ${
                            isHovered ? 'bg-[#FAFBF9]' : 'bg-white'
                          }`}
                        >
                          <div className="sm:col-span-5 flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-[#64748B] shrink-0" strokeWidth={1.75} />
                            <span className="font-display font-semibold text-sm text-[#0B0F0E]">{row.cap}</span>
                          </div>
                          <div className="sm:col-span-7 flex items-center gap-2 text-sm text-[#64748B]">
                            <X className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" strokeWidth={2} />
                            <span>{row.mooc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Elevated Jet-Black Featured SEMS Card */}
                <div className="md:col-span-5 bg-[#0A0A0A] text-white rounded-2xl border border-[#181F1D] shadow-2xl md:-my-3 z-10 overflow-hidden flex flex-col">
                  <div className="px-6 py-4 md:py-[22px] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.1em] font-semibold text-white">
                      <PulseDot />
                      SEMS Suite
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.08em] text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/25">
                      Institutional Standard
                    </span>
                  </div>
                  <div className="divide-y divide-white/[0.08] flex-1 flex flex-col justify-between md:pb-3">
                    {rows.map((row, idx) => {
                      const isHovered = hoveredRow === idx;
                      return (
                        <div
                          key={row.cap}
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className={`flex items-center gap-3 px-6 py-4 min-h-[68px] transition-colors ${
                            isHovered ? 'bg-white/[0.04]' : ''
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={2.5} />
                          </span>
                          <div className="min-w-0">
                            <div className="sm:hidden text-[10px] font-mono uppercase tracking-[0.08em] text-white/50 mb-0.5">
                              {row.cap}
                            </div>
                            <span className="text-sm font-medium text-white">{row.sems}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* 2x2 Architectural Role Bento Grid */}
        <section aria-labelledby="roles-heading" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="mb-8">
            <p id="roles-heading" className="eyebrow-rule font-mono text-xs uppercase tracking-[0.12em] text-[#065F46]">
              Access by Role
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] leading-[1.1] text-[#0B0F0E] mt-2">
              Dedicated portals for every participant.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ROLE_CARDS.map((item) => (
              <RoleCard key={item.role} item={item} reduced={reduced} />
            ))}
          </div>
        </section>

        {/* Executive Quote & Compliance Strip */}
        <section id="compliance-strip" aria-label="Institutional endorsement and compliance" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 space-y-8">
          <blockquote className="luxury-card rounded-2xl p-7 sm:p-9 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <p className="font-display font-semibold text-lg sm:text-xl tracking-[-0.02em] text-[#0B0F0E] max-w-[60ch] leading-snug">
              &ldquo;During a regional fiber outage mid-finals, 1,400 candidates kept writing without losing a single response—and not one deadline was compromised.&rdquo;
            </p>
            <footer className="shrink-0 md:text-right border-t md:border-t-0 md:border-l border-[#E4E8E6] pt-4 md:pt-0 md:pl-6">
              <div className="text-sm font-semibold text-[#0B0F0E]">Dr. Eleanor Vance</div>
              <div className="text-xs font-mono text-[#6B7280] mt-0.5">Chief Registrar · Alderidge University</div>
            </footer>
          </blockquote>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {[
              'ISO 27001 Aligned',
              'WCAG 2.1 AA Certified',
              'Zero-Trust Server Timing',
              'Cryptographic QR Transcripts',
              'GDPR & FERPA Ready',
            ].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E4E8E6] text-xs font-mono text-[#4B5563]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" strokeWidth={1.75} />
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* Closing CTA Band */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-2xl bg-[#0B0F0E] border border-[#181F1D] p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] text-white mb-1.5">
                Ready for the examination hall.
              </h2>
              <p className="text-sm text-white/70">
                Sign in with your institutional credentials to enter your workspace.
              </p>
            </div>
            <Link
              to={isAuthenticated ? getRoleHome(user.role) : '/login'}
              className="group relative overflow-hidden min-h-[48px] shrink-0 inline-flex items-center gap-2 bg-[#059669] hover:bg-[#10B981] text-white font-semibold px-6 py-3 rounded-full shadow-sm active:scale-[0.98] transition-all duration-200"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                {isAuthenticated ? 'Enter workspace' : 'Sign in'}
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#0A0A0A] text-white border-t border-[#181F1D] py-10 px-4 sm:px-6 lg:px-8 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display font-extrabold text-base tracking-[-0.04em] text-white">SEMS</span>
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#10B981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
                All Examination Regions Operational
              </span>
            </div>
            <p className="text-white/60">
              &copy; 2026 SEMS Assessment Technologies. Serving institutions since 2014.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-white/70">
            <a href="#story-heading" className="hover:text-white transition-colors">Platform</a>
            <a href="#comparison-heading" className="hover:text-white transition-colors">Architecture</a>
            <a href="#compliance-strip" className="hover:text-white transition-colors">Compliance</a>
            <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link to="/verify/VER-2026-SEMS-8841" className="text-[#10B981] hover:text-white transition-colors">Verify Report</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
