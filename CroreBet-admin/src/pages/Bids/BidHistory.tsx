import { useEffect, useState } from 'react';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { todayLocal } from '../../utils/date';

interface BidRow {
  id: string;
  index: number;
  userName: string;
  userMobile: string;
  bidTxId: string;
  gameName: string;
  gameType: string;
  session: string;
  number: string;
  points: number;
  status: string;
  bidDate: string;
}

interface Market {
  id: string;
  name: string;
}

const GAME_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'single', label: 'Single Digit' },
  { value: 'jodi', label: 'Jodi Digit' },
  { value: 'single_panna', label: 'Single Pana' },
  { value: 'double_panna', label: 'Double Pana' },
  { value: 'triple_panna', label: 'Triple Pana' },
  { value: 'half_sangam', label: 'Half Sangam' },
  { value: 'full_sangam', label: 'Full Sangam' },
];

const prettyGame = (t: string) =>
  GAME_TYPES.find((g) => g.value === t)?.label || t;

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

export default function BidHistory() {
  const today = todayLocal();

  const [date, setDate] = useState(today);
  const [market, setMarket] = useState('');
  const [gameType, setGameType] = useState('');
  const [rows, setRows] = useState<BidRow[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [total, setTotal] = useState(0);
  const [filterTotal, setFilterTotal] = useState(0);   // 🚀 full filtered amount (all pages)
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    api
      .get('/admin/games')
      .then((r) => setMarkets(r.data.data || []))
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const { data } = await api.get('/admin/bids', {
        params: {
          date: date || undefined,
          market: market || undefined,
          gameType: gameType || undefined,
          page,
          limit,
        },
      });
      setRows(data.data.rows);
      setTotal(data.data.total);
      setPages(data.data.pages);
      // 🚀 Backend returns full filtered sum in summary.totalAmount
      setFilterTotal(Number(data.data.summary?.totalAmount || 0));
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
      setRows([]);
      setFilterTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // 🚀 Current page total only (for the table footer)
  const pageTotalPoints = rows.reduce((s, r) => s + r.points, 0);

  // ---------- COPY ----------
  const copyAll = async () => {
    if (!rows.length) return alert('No data to copy');
    let txt = `Bid History\nDate: ${date}\nGame: ${market || 'all'}\nType: ${prettyGame(gameType)}\n\n`;
    txt += `#\tUser Name\tMobile\tBid TXID\tGame Name\tGame Type\tSession\tNumber\tPoints\tPlaced On\n`;
    rows.forEach((r) => {
      txt += `${r.index}\t${r.userName}\t${r.userMobile}\t${r.bidTxId}\t${r.gameName}\t${r.gameType}\t${r.session}\t${r.number}\t${r.points}\t${fmtDateTime(r.bidDate)}\n`;
    });
    try {
      await navigator.clipboard.writeText(txt);
      alert('Copied');
    } catch {
      alert('Copy failed');
    }
  };

  // ---------- CSV ----------
  const exportCSV = () => {
    if (!rows.length) return alert('No data to export');
    const lines: string[] = [];
    lines.push('Bid History');
    lines.push(`Date,${date}`);
    lines.push(`Game,${market || 'all'}`);
    lines.push(`Type,${gameType || 'all'}`);
    lines.push('');
    lines.push('#,User Name,Mobile,Bid TXID,Game Name,Game Type,Session,Number,Points,Placed On');
    rows.forEach((r) => {
      lines.push(
        `${r.index},"${r.userName}","${r.userMobile}","${r.bidTxId}","${r.gameName}","${r.gameType}","${r.session}","${r.number}",${r.points},"${fmtDateTime(r.bidDate)}"`
      );
    });
    lines.push('');
    lines.push(`Page Total,${pageTotalPoints}`);
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bid_history_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- PDF ----------
  const exportPDF = () => {
    if (!rows.length) return alert('No data to export');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(120, 6, 6);
    doc.rect(0, 0, 297, 20, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Crorebet', 14, 12);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Bid History', 14, 17);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(
      `Date: ${date}  |  Game: ${market || 'all'}  |  Type: ${prettyGame(gameType)}  |  Records: ${rows.length}`,
      14,
      28
    );
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 33);

    autoTable(doc, {
      startY: 38,
      head: [['#', 'User Name', 'Mobile', 'Bid TXID', 'Game Name', 'Game Type', 'Session', 'Number', 'Points', 'Placed On']],
      body: rows.map((r) => [
        String(r.index),
        r.userName,
        r.userMobile,
        r.bidTxId.slice(0, 8),
        r.gameName,
        r.gameType,
        r.session,
        r.number,
        String(r.points),
        fmtDateTime(r.bidDate),
      ]),
      foot: [['', '', '', '', '', '', '', '', 'Page Total:', String(pageTotalPoints), '']],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [120, 6, 6],
        textColor: [212, 175, 55],
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 245, 235] },
    });
    doc.save(`bid_history_${date}.pdf`);
  };

  // ---------- PRINT ----------
  const printReport = () => {
    if (!rows.length) return alert('No data to print');
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `
      <html><head><title>Bid History - ${date}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #780606; margin: 0; }
        h2 { color: #333; margin: 4px 0 16px; font-size: 14px; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; text-align: left; }
        th { background: #780606; color: #d4af37; }
        tr:nth-child(even) { background: #faf5eb; }
        tfoot td { background: #f5f5f5; font-weight: bold; }
      </style></head><body>
        <h1>Crorebet</h1>
        <h2>Bid History · Date: ${date} · Game: ${market || 'all'} · Type: ${prettyGame(gameType)} · Records: ${rows.length}</h2>
        <table>
          <thead><tr>
            <th>#</th><th>User Name</th><th>Mobile</th><th>Bid TXID</th>
            <th>Game Name</th><th>Game Type</th><th>Session</th><th>Number</th>
            <th>Points</th><th>Placed On</th>
          </tr></thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
              <td>${r.index}</td>
              <td>${r.userName}</td>
              <td>${r.userMobile}</td>
              <td>${r.bidTxId.slice(0, 8)}</td>
              <td>${r.gameName}</td>
              <td>${r.gameType}</td>
              <td>${r.session}</td>
              <td>${r.number}</td>
              <td>${r.points}</td>
              <td>${fmtDateTime(r.bidDate)}</td>
            </tr>`
              )
              .join('')}
          </tbody>
          <tfoot><tr>
            <td colspan="8">Page Total</td>
            <td>${pageTotalPoints}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  const paginationRange = () => {
    const range: (number | '...')[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) range.push(i);
      return range;
    }
    range.push(1);
    if (page > 4) range.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(pages - 1, page + 1);
    for (let i = start; i <= end; i++) range.push(i);
    if (page < pages - 3) range.push('...');
    range.push(pages);
    return range;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">
            Bid History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            All bids for a date, market, and game type
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyAll}
            className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded font-medium"
          >
            Copy
          </button>
          <button
            onClick={exportCSV}
            className="text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded font-medium"
          >
            CSV
          </button>
          <button
            onClick={exportPDF}
            className="text-sm bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded font-medium"
          >
            PDF
          </button>
          <button
            onClick={printReport}
            className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded font-medium"
          >
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
            <label className="text-xs text-slate-500 mb-1 block">Game Name</label>
            <select
              className="input"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            >
              <option value="">All Games</option>
              {markets.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Game Type</label>
            <select
              className="input"
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
            >
              {GAME_TYPES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setPage(1);
                load();
              }}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Loading...' : 'SAVE'}
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

      {/* Summary bar — 🚀 uses filterTotal (all pages) */}
      {hasSearched && !loading && rows.length > 0 && (
        <div className="bg-brand-card border border-brand-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-400">
            <span className="text-slate-100 font-medium">{market || 'All Games'}</span>
            <span className="mx-2">·</span>
            <span className="text-brand-accent uppercase">
              {prettyGame(gameType)}
            </span>
            <span className="mx-2">·</span>
            <span>{date}</span>
            <span className="mx-2">·</span>
            <span>{total} bids</span>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-500">Total Points</p>
            <p className="text-xl font-bold text-emerald-400">
              ₹{filterTotal.toLocaleString('en-IN')}
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
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Mobile Number</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Bid TXID</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game Name</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game Type</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Session</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Number</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Points</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase whitespace-nowrap">Placed On</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : !hasSearched ? (
                <tr>
                  <td colSpan={10} className="text-center text-slate-500 py-12">
                    Set filters and click SAVE
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center text-slate-500 py-12">
                    No bids found for the selected filters
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-brand-border hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-3 py-3 text-slate-500">{r.index}</td>
                    <td className="px-3 py-3 text-slate-200 font-medium">
                      {r.userName}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">
                      {r.userMobile}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">
                      {r.bidTxId.slice(0, 8)}…
                    </td>
                    <td className="px-3 py-3 text-slate-300 uppercase font-medium">
                      {r.gameName}
                    </td>
                    <td className="px-3 py-3 text-slate-300 capitalize">
                      {r.gameType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          r.session === 'open'
                            ? 'bg-blue-900/50 text-blue-300'
                            : r.session === 'close'
                            ? 'bg-amber-900/50 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {r.session}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-200">
                      {r.number}
                    </td>
                    <td className="px-3 py-3 text-right text-amber-400 font-bold">
                      ₹{r.points.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {fmtDateTime(r.bidDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-brand-border bg-slate-800/40">
                  <td colSpan={8} className="px-3 py-3 text-xs text-slate-400 font-medium">
                    Page Total ({rows.length} bids on this page)
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-400">
                    ₹{pageTotalPoints.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3"></td>
                </tr>
              </tfoot>
            )}
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
              <span className="text-xs text-slate-500 ml-2">{total} bids</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                Prev
              </button>

              {paginationRange().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-slate-500 text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    onClick={() => setPage(p as number)}
                    className={`px-3 py-1 text-xs rounded ${
                      p === page
                        ? 'bg-brand-accent text-slate-900 font-bold'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

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
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}