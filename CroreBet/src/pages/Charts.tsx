import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StarEmbers from '../components/StarEmbers';

interface Market { id: string; name: string; slug: string; openTime: string | null; }

export default function Charts() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/charts')
      .then((r) => setMarkets(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  // Restore precise sorting logic
  const sortedMarkets = [...markets].sort((a, b) => {
    const getMinutes = (t: string | null) => {
      if (!t) return 9999;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return getMinutes(a.openTime) - getMinutes(b.openTime);
  });

  return (
    <div className="theme-page relative min-h-screen">
      <StarEmbers />
      
      <div className="relative max-w-5xl mx-auto px-4 py-16 z-10">
        {/* Ambient glows behind the content */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-orange-600/15 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-red-600/15 blur-[100px]" />

        {/* Header */}
        <div className="relative text-center mb-12">
          <div className="text-4xl mb-3 drop-shadow-md">📊</div>
          <h1 className="font-kanit text-5xl md:text-6xl font-black text-gray-900 drop-shadow-md mb-4 uppercase tracking-wide">
            Historical Charts
          </h1>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-gray-900 to-transparent rounded-full mb-4" />
          <p className="text-gray-800 font-bold uppercase tracking-widest text-sm drop-shadow-sm">
            Select a market to view results
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-orange-500/40 rounded-full animate-spin [animation-duration:2s]" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🔥</div>
            </div>
          </div>
        ) : (
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5">
            {sortedMarkets.map((m) => (
              <div key={m.id} className="obsidian-card theme-card chart-palette group">
                <div className="chart-palette-header flex items-center gap-3 mb-5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_10px_#facc15] animate-pulse" />
                  <h3 className="font-kanit text-2xl font-black text-white uppercase tracking-wider truncate">
                    {m.name}
                  </h3>
                </div>
                <div className="flex gap-3">
                  <Link to={`/charts/${encodeURIComponent(m.name)}/jodi`} className="ghost-btn-gold flex-1 text-sm py-3">
                    🎯 Jodi Chart
                  </Link>
                  <Link to={`/charts/${encodeURIComponent(m.name)}/pana`} className="ghost-btn-gold flex-1 text-sm py-3">
                    🔢 Pana Chart
                  </Link>
                </div>
              </div>
            ))}
            {sortedMarkets.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-12 bg-black/40 rounded-3xl border border-white/10 backdrop-blur-md">
                <div className="text-5xl mb-4 opacity-60">🔥</div>
                <p className="text-gray-300 font-bold uppercase tracking-widest">
                  No charts available yet. Markets will appear once admin adds them.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
