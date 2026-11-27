import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleHome } from '../context/AuthContext';
import { Shield, WifiOff, Scale, ArrowRight, FileCheck2 } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const containerRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
        tl.from('.hero-stagger', {
          y: 14,
          opacity: 0,
          duration: 0.42,
          stagger: 0.08,
        });
      });
      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="flex flex-col min-h-[calc(100vh-64px)]">
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <section className="max-w-3xl">
          <p className="hero-stagger font-mono text-xs tracking-wider text-cobalt uppercase mb-4">
            TechnoVerse 5.0 · Secure Examination Management System
          </p>
          <h1 className="hero-stagger font-serif text-4xl sm:text-6xl text-ink leading-[1.08] tracking-tight mb-6">
            High-stakes online examinations built for fairness, resilience, and zero-clock drift.
          </h1>
          <p className="hero-stagger text-base sm:text-lg text-ink-muted leading-relaxed mb-8 max-w-2xl">
            SEMS enforces server-authoritative timing, snapshotted question papers, offline-resilient answer queues, and verifiable result transcripts—without sacrificing candidate calm.
          </p>

          <div className="hero-stagger flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Link
                to={getRoleHome(user.role)}
                className="min-h-[44px] inline-flex items-center gap-2 bg-cobalt hover:bg-navy-800 text-white font-semibold px-5 py-3 rounded-lg transition-transform active:scale-[0.97]"
              >
                Open {user.role} workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="min-h-[44px] inline-flex items-center gap-2 bg-cobalt hover:bg-navy-800 text-white font-semibold px-5 py-3 rounded-lg transition-transform active:scale-[0.97]"
              >
                Sign in to SEMS
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              to="/verify/VER-2026-SEMS-8841"
              className="min-h-[44px] inline-flex items-center gap-2 bg-surface hover:bg-subtle text-ink font-medium px-5 py-3 rounded-lg border border-line transition-colors active:scale-[0.97]"
            >
              <FileCheck2 className="w-4 h-4 text-cobalt" />
              Verify a report
            </Link>
          </div>
        </section>

        <section aria-labelledby="how-sems-works" className="mt-16 pt-12 border-t border-line">
          <h2 id="how-sems-works" className="font-serif text-2xl sm:text-3xl text-ink mb-6">
            How SEMS keeps exams fair and resilient
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="hero-stagger glass-tile rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-navy-50 text-cobalt flex items-center justify-center mb-4">
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">5.3 Failure-Resilient Delivery</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Answers queue locally with sequence numbers during outages and sync automatically on reconnect within a bounded late-sync window—while the server deadline never shifts.
              </p>
            </div>

            <div className="hero-stagger glass-tile rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-navy-50 text-cobalt flex items-center justify-center mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">5.2 Balanced Paper Fairness</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Blueprint-driven randomization draws distinct question combinations per candidate while holding topic and difficulty index consistent across every paper.
              </p>
            </div>

            <div className="hero-stagger glass-tile rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-navy-50 text-cobalt flex items-center justify-center mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Verifiable Transcripts</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Every published transcript carries an unguessable verification ID and QR code that confirms authenticity publicly without exposing private candidate records.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface py-6 px-4 sm:px-6 lg:px-8 text-xs font-mono text-ink-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SEMS — Secure Examination Management System (TechnoVerse 5.0)</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-ink">Sign in</Link>
            <Link to="/verify/VER-2026-SEMS-8841" className="hover:text-ink">Verify Report</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
