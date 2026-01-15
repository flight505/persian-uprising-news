import NewsFeed from './components/NewsFeed/NewsFeed';
import Link from 'next/link';
import { Activity, ShieldCheck, WifiOff } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Quick Access Dashboard */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/connectivity"
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Activity className="w-6 h-6 mb-2" />
              <span className="text-xs font-semibold">Connectivity</span>
            </Link>

            <Link
              href="/verification"
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <ShieldCheck className="w-6 h-6 mb-2" />
              <span className="text-xs font-semibold">Verification</span>
            </Link>

            <Link
              href="/offline"
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <WifiOff className="w-6 h-6 mb-2" />
              <span className="text-xs font-semibold">Offline Tools</span>
            </Link>
          </div>
        </div>
      </section>

      <NewsFeed />
    </main>
  );
}
