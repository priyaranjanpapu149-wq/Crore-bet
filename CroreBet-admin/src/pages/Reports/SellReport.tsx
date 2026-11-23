import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { todayLocal } from '../../utils/date';

interface ColumnData {
  total: number;
  rows: { digit: string; amount: number }[];
}

interface SellData {
  date: string;
  session: string;
  type: string;
  columns: Record<string, ColumnData>;
  totalBids: number;
  totalAmount: number;
}

interface Market {
  id: string;
  name: string;
}

const COLUMN_LABELS: Record<string, string> = {
  single: 'Single Digit',
  jodi: 'Jodi Digit',
  panna: 'Panna Digit',
  sangam: 'Sangam',
};

export default function SellReport() {
  const today = todayLocal();

  const [date, setDate] = useState(today);
  const [marketId, setMarketId] = useState('');
  const [session, setSession] = useState('open');
  const [type, setType] = useState('all');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [data, setData] = useState<SellData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load markets once
  useEffect(() => {
    api
      .get('/admin/games')
      .then((r) => setMarkets(r.data.data || []))
      .catch(() => {});
  }, []);

  const load = async () => {
    if (!date || !marketId || !session) {
      setError('Date, Market, and Session are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/reports/sell', {
        params: { date, marketId, session, type },
      });
      setData(data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const marketName = markets.find((m) => m.id === marketId)?.name || '—';

  // Get column keys (filter empty ones)
  const columnKeys = data
    ? Object.keys(data.columns).filter((k) => data.columns[k].rows.length > 0)
    : [];

  // Max rows across all columns (like PHP table height)
  const maxRows = data
    ? Math.max(
        ...columnKeys.map((k) => data.columns[k].rows.length),
        0
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">
            Sell Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Grouped bid totals per digit / number for a market + session
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Game</label>
            <select
              className="input"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
            >
              <option value="">Select Game</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Session</label>
            <select
              className="input"
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="close">Close</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Game Type</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All</option>
              <option value="single">Single</option>
              <option value="jodi">Jodi</option>
              <option value="panna">Panna</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={load}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Loading...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
        </div>
      )}

      {/* Summary bar */}
      {data && !loading && (
        <div className="bg-brand-card border border-brand-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-400">
            <span className="text-slate-100 font-medium">{marketName}</span>
            <span className="mx-2">·</span>
            <span className="text-brand-accent uppercase">{data.session}</span>
            <span className="mx-2">·</span>
            <span>{data.date}</span>
            <span className="mx-2">·</span>
            <span>{data.totalBids} bids</span>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-500">Grand Total</p>
            <p className="text-xl font-bold text-emerald-400">
              {money(data.totalAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Columns grid */}
      {data && !loading && columnKeys.length > 0 && (
        <div className="space-y-6">
          {columnKeys.map((key) => {
            const col = data.columns[key];
            return (
              <div
                key={key}
                className="bg-brand-card border border-brand-border rounded-lg overflow-hidden"
              >
                {/* Column header */}
                <div className="px-4 py-3 bg-slate-800/60 border-b border-brand-border flex items-center justify-between">
                  <h2 className="text-sm font-bold text-brand-accent uppercase tracking-wider">
                    {COLUMN_LABELS[key] || key}
                  </h2>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">
                      {col.rows.length} numbers
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {money(col.total)}
                    </span>
                  </div>
                </div>

                {/* Digit grid — chunked into rows of 10 */}
                <div className="p-3">
                  {chunkArray(col.rows, 10).map((chunk, chunkIdx) => (
                    <div
                      key={chunkIdx}
                      className="grid grid-cols-10 gap-0.5 mb-0.5"
                    >
                      {chunk.map((r, i) => (
                        <div
                          key={`${r.digit}-${chunkIdx}-${i}`}
                          className="text-center border border-brand-border/40 py-1.5"
                        >
                          <div className="text-xs text-slate-400 font-mono">
                            {r.digit}
                          </div>
                          <div
                            className={`text-xs font-bold mt-0.5 px-1 py-0.5 rounded ${
                              r.amount === 0
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-blue-900/50 text-blue-200'
                            }`}
                          >
                            {r.amount}
                          </div>
                        </div>
                      ))}
                      {/* Fill empty cells so grid stays 10-wide */}
                      {Array.from({ length: 10 - chunk.length }).map((_, i) => (
                        <div
                          key={`empty-${chunkIdx}-${i}`}
                          className="border border-transparent py-1.5"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {data && !loading && columnKeys.length === 0 && (
        <div className="bg-brand-card border border-brand-border rounded-lg p-12 text-center">
          <p className="text-slate-500">No bids found for the selected filters</p>
        </div>
      )}

      {/* Initial state */}
      {!data && !loading && !error && (
        <div className="bg-brand-card border border-brand-border rounded-lg p-12 text-center">
          <p className="text-slate-500">
            Select a market and session, then click Submit
          </p>
        </div>
      )}
    </div>
  );
}

// Helper: split array into chunks of `size`
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}