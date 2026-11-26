import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 text-center">
      <div className="font-heading text-7xl font-extrabold text-blue-500 mb-2">404</div>
      <h1 className="font-heading text-2xl font-bold text-white mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-sm mb-6">
        The route you are searching for does not exist in this TechnoVerse node.
      </p>
      <Link
        to="/"
        className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
      >
        Return to Home
      </Link>
    </div>
  );
};
