import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import StarEmbers from '../components/StarEmbers';

export default function JodiChart() {
  const { market } = useParams<{ market: string }>();
  const [weeks, setWeeks] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (!market) return;
    api.get(`/charts/${encodeURIComponent(market)}/jodi`)
      .then((r) => {
        // 🚀 CHANGED: Sort oldest to newest (newest at the bottom)
        const sorted = [...r.data.data.weeks].sort((a, b) => {
          const dateA = new Date(a[0]?.date || 0).getTime();
          const dateB = new Date(b[0]?.date || 0).getTime();
          return dateA - dateB;
        });
        setWeeks(sorted);
      })
      .finally(() => setLoading(false));
  }, [market]);

  return (
    <div className="theme-page relative min-h-screen">
      <StarEmbers />

      <div className="max-w-5xl mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-10">
          <Link to="/charts" className="inline-block text-gray-800 font-bold uppercase tracking-widest text-xs mb-4 hover:text-black transition-colors bg-white/30 px-4 py-2 rounded-full backdrop-blur-md">
            ← Back to Charts
          </Link>
          <h1 className="font-kanit text-4xl md:text-5xl font-black text-gray-900 mt-4 uppercase drop-shadow-md">
            {market} Jodi Chart
          </h1>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-gray-900 to-transparent rounded-full mt-4 mb-3" />
          <p className="text-gray-800 font-bold text-sm max-w-2xl mx-auto tracking-wide">
            {market} Jodi Chart — Crore Bet record, old history, bracket results, live digits.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : weeks.length === 0 ? (
          <p className="text-center text-gray-800 font-black tracking-widest uppercase py-12 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30">
            No data available yet.
          </p>
        ) : (
          <div className="overflow-x-auto obsidian-card theme-card p-0">
            <table className="w-full text-center min-w-[600px]">
              <thead>
                <tr className="bg-yellow-500/10 border-b-2 border-yellow-500/30">
                  {days.map((d) => (
                    <th key={d} className="py-4 px-2 text-xs font-black text-gold uppercase tracking-widest">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    {week.map((day: any, di: number) => (
                      <td key={di} className="py-4 px-2 font-mono text-xl font-bold text-gray-100">
                        {day.jodi || '—'}
                      </td>
                    ))}
                    {Array.from({ length: 7 - week.length }).map((_, ei) => (
                      <td key={`e${ei}`} className="py-4 px-2 text-gray-600">—</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
