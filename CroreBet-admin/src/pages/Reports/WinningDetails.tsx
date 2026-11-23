import { useEffect, useState } from 'react';
import api from '../../api/axios';

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface WinningRow {
  id: string;
  userName: string;
  userMobile: string;
  bidPoints: number;
  winningPoints: number;
  marketName: string;
  gameName: string;
  bidNumber: string;
  date: string;
  remark: string;
}

export default function WinningDetails() {
  const today = todayLocal();

  const [rows, setRows] = useState<WinningRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🚀 Default to TODAY
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/reports/winning-details', {
        params: {
          page,
          limit,
          from: from || undefined,
          to: to || undefined,
          search: search || undefined,
        },
      });
      setRows(data.data.rows);
      setTotal(data.data.total);
      setPages(data.data.pages);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Auto-reload whenever filters change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, from, to, search]);

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const totalWinning = rows.reduce((s, r) => s + r.winningPoints, 0);
  const totalBid = rows.reduce((s, r) => s + r.bidPoints, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">
            Winning Details
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {from === to ? `Today (${from})` : `${from} → ${to}`} · {total} records
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">From Date</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">To Date</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">
              Search (mobile / name)
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(searchInput);
                    setPage(1);
                  }
                }}
              />
              <button
                onClick={() => {
                  setSearch(searchInput);
                  setPage(1);
                }}
                className="btn-primary"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setFrom(today);
                  setTo(today);
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary strip */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
            <p className="text-xs uppercase text-slate-500 font-medium">
              Bid Points (this page)
            </p>
            <p className="text-xl md:text-2xl font-bold text-amber-400 mt-1">
              {money(totalBid)}
            </p>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
            <p className="text-xs uppercase text-slate-500 font-medium">
              Winning Points (this page)
            </p>
            <p className="text-xl md:text-2xl font-bold text-emerald-400 mt-1">
              {money(totalWinning)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">User Name</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Mobile</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Bid Points</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Winning Points</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Market</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Bid Number</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-slate-500 py-12">
                    No winning records found for this date range
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="border-t border-brand-border hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-3 py-3 text-slate-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-3 py-3 text-slate-200 font-medium">
                      {r.userName}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">
                      {r.userMobile}
                    </td>
                    <td className="px-3 py-3 text-right text-amber-400 font-medium">
                      {money(r.bidPoints)}
                    </td>
                    <td className="px-3 py-3 text-right text-emerald-400 font-bold">
                      +{money(r.winningPoints)}
                    </td>
                    <td className="px-3 py-3 text-slate-300">{r.marketName}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs">{r.gameName}</td>
                    <td className="px-3 py-3 font-mono text-slate-200">
                      {r.bidNumber}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(r.date).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex flex-wrap items-center justify-between px-4 py-3 border-t border-brand-border gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select
                className="text-xs bg-slate-800 border border-brand-border rounded px-2 py-1 text-slate-200"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs text-slate-500 ml-2">
                {total} records
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                « First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                Prev
              </button>

              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                let p = i + 1;
                if (pages > 7 && page > 4) p = page - 3 + i;
                if (p > pages) p = pages - (6 - i);
                return (
                  <button
                    key={`page-${p}`}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-xs rounded ${
                      p === page
                        ? 'bg-brand-accent text-slate-900 font-bold'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                Next
              </button>
              <button
                onClick={() => setPage(pages)}
                disabled={page >= pages}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                Last »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}