import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { HeroCanvas } from '../components/canvas/HeroCanvas';
import { ArrowRight, ShieldCheck, Cpu, Database, Sparkles } from 'lucide-react';

export const HomePage = () => {
  const heroRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-headline', {
        y: 30,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
      });
      gsap.from('.hero-sub', {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out',
      });
      gsap.from('.hero-cta', {
        y: 15,
        opacity: 0,
        duration: 0.7,
        delay: 0.4,
        ease: 'power3.out',
      });
      gsap.from('.hero-badge', {
        scale: 0.85,
        opacity: 0,
        duration: 0.6,
        ease: 'back.out(1.7)',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
        {/* Left Column: Typography & Action */}
        <div className="lg:col-span-7 flex flex-col gap-6 z-10">
          <div className="hero-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold w-fit tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            MERN HACKATHON PROTOCOL READY
          </div>

          <h1 className="hero-headline font-heading text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Architecting the Future with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">TechnoVerse</span>
          </h1>

          <p className="hero-sub text-base sm:text-lg text-slate-400 max-w-xl font-normal leading-relaxed">
            A high-performance decoupled MERN architecture designed for distributed teams. Built with independent contracts, rigorous security boundaries, and responsive 3D web animations.
          </p>

          <div className="hero-cta flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 active:scale-[0.98]"
            >
              Launch Workspace
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 glass-panel hover:bg-white/5 text-slate-200 font-semibold px-6 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
            >
              View Dashboard
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 max-w-md">
            <div>
              <div className="font-heading text-2xl font-bold text-white">60 FPS</div>
              <div className="text-xs text-slate-400">Three.js Motion</div>
            </div>
            <div>
              <div className="font-heading text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-slate-400">Decoupled Stack</div>
            </div>
            <div>
              <div className="font-heading text-2xl font-bold text-white">OWASP</div>
              <div className="text-xs text-slate-400">Pre-deploy Audited</div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Interactive Canvas */}
        <div className="lg:col-span-5 h-[420px] sm:h-[480px] relative z-10 flex items-center justify-center">
          <HeroCanvas />
        </div>
      </main>

      {/* Feature Architecture Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3 hover:border-blue-500/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white">Security-First Core</h3>
            <p className="text-sm text-slate-400">
              Zero hardcoded secrets, salted bcrypt hashing, JWT token rotation, and rate-limited authentication.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3 hover:border-indigo-500/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white">Independent Frontend</h3>
            <p className="text-sm text-slate-400">
              Vite SPA with custom styling, GSAP animations, and offline mock services conforming to BACKEND.md.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3 hover:border-cyan-500/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white">Zip-Ready Backend</h3>
            <p className="text-sm text-slate-400">
              Express REST server with Mongoose schemas that can be zipped and handed off to backend teammates immediately.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
