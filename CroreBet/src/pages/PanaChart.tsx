import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import StarEmbers from '../components/StarEmbers';

export default function PanaChart() {
  const { market } = useParams<{ market: string }>();
  const [weeks, setWeeks] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (!market) return;
    api.get(`/charts/${encodeURIComponent(market)}/pana`)
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

      <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-10">
          <Link to="/charts" className="inline-block text-gray-800 font-bold uppercase tracking-widest text-xs mb-4 hover:text-black transition-colors bg-white/30 px-4 py-2 rounded-full backdrop-blur-md">
            ← Back to Charts
          </Link>
          <h1 className="font-kanit text-4xl md:text-5xl font-black text-gray-900 mt-4 uppercase drop-shadow-md">
            {market} Pana Chart
          </h1>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-gray-900 to-transparent rounded-full mt-4 mb-3" />
          <p className="text-gray-800 font-bold text-sm max-w-2xl mx-auto tracking-wide">
            {market} Panel Chart — Crore Bet record, old history, full panna brackets.
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
          <div className="overflow-x-auto obsidian-card p-0 border border-yellow-500/30 rounded-3xl bg-white/40 backdrop-blur-md">
            <table className="w-full text-center min-w-[800px]">
              <thead>
                <tr className="bg-yellow-500/20 border-b-2 border-yellow-500/50">
                  <th className="py-4 px-2 text-xs font-black text-gray-900 uppercase tracking-widest w-24">Date</th>
                  {days.map((d) => (
                    <th key={d} className="py-4 px-2 text-xs font-black text-gray-900 uppercase tracking-widest">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi} className="border-b border-gray-300 hover:bg-yellow-100/50 transition-colors">
                    <td className="py-4 px-2 text-xs font-bold text-gray-700 whitespace-nowrap bg-black/5">
                      {week[0]?.date ? new Date(week[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      <br />↓<br />
                      {week[week.length - 1]?.date ? new Date(week[week.length - 1].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    {week.map((day: any, di: number) => (
                      <td key={di} className="py-3 px-1 border-l border-gray-200">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Open Panna */}
                          <span className="text-[11px] text-gray-600 font-bold tracking-wider">
                            {day.openPanna || '***'}
                          </span>
                          
                          {/* Jodi (OpenDigit + CloseDigit) */}
                          <span className="font-mono text-sm font-black text-gray-900 bg-yellow-400 px-3 py-0.5 rounded shadow-sm border border-yellow-600">
                            {day.openDigit || '*'}{day.closeDigit || '*'}
                          </span>
                          
                          {/* Close Panna */}
                          <span className="text-[11px] text-gray-600 font-bold tracking-wider">
                            {day.closePanna || '***'}
                          </span>
                        </div>
                      </td>
                    ))}
                    {/* Fill empty days in the week */}
                    {Array.from({ length: 6 - week.length }).map((_, ei) => (
                      <td key={`e${ei}`} className="py-3 px-1 text-gray-400 border-l border-gray-200">—</td>
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
