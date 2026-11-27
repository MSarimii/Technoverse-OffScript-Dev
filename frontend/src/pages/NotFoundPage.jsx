import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const FRAMES = [
  '  [ 4 0 4 ]  //  SECTOR_NOT_FOUND\n  > scanning_exam_registry...',
  '  [ 4 0 4 ]  //  SECTOR_NOT_FOUND\n  > scanning_exam_registry..',
  '  [ 4 0 4 ]  //  SECTOR_NOT_FOUND\n  > scanning_exam_registry.',
];

export const NotFoundPage = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % FRAMES.length), 650);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center">
      <pre
        aria-hidden="true"
        className="inline-block text-left font-mono text-xs text-ink-muted bg-surface border border-line rounded-xl px-5 py-3 mb-6"
      >
        {FRAMES[idx]}
      </pre>
      <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] text-ink mb-3">Page not found</h1>
      <p className="text-sm text-ink-muted mb-6">
        The examination resource you requested does not exist or has moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center min-h-[44px] bg-cobalt hover:bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg active:scale-[0.97]"
      >
        Return home
      </Link>
    </main>
  );
};
