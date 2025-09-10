import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold text-diogenes-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-300 mb-8 max-w-md mx-auto">
          Even Diogenes couldn't find what you're looking for. 
          Perhaps it's hiding in the barrel?
        </p>
        <Link
          href="/"
          className="inline-block bg-diogenes-primary text-white px-6 py-3 rounded-lg hover:bg-diogenes-secondary transition-colors"
        >
          Return to Wisdom
        </Link>
      </div>
    </div>
  );
}