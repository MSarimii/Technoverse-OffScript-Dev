import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <main className="max-w-lg mx-auto px-4 py-20 text-center">
    <p className="font-mono text-xs text-ink-muted mb-2">404</p>
    <h1 className="font-serif text-4xl text-ink mb-3">Page not found</h1>
    <p className="text-sm text-ink-muted mb-6">
      The examination resource you requested does not exist or has moved.
    </p>
    <Link
      to="/"
      className="inline-block bg-navy-900 text-white text-sm font-semibold px-5 py-2.5 rounded-md"
    >
      Return home
    </Link>
  </main>
);
