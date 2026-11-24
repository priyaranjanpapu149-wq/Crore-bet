import { useEffect, useState } from 'react';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { todayLocal } from '../../utils/date';

interface Market { id: string; name: string; slug: string; }
interface SummaryItem { total: number; profit: number; payout: number; }
interface Row { digit: string; totalBids: number; amountToPay: number; profit: number; loss: number; }
interface Table { title: string; rows: Row[]; }

interface Data {
  market: { id: string; name: string };
  session: string;
  date: string;
  summary: {
    single: SummaryItem;
    jodi: SummaryItem;
    pana: SummaryItem;
    halfSangam: SummaryItem;
    fullSangam: SummaryItem;
    totalPlay: number;
    totalPayout: number;
    totalProfit: number;
  };
  breakdown?: Row[];
  tables?: Table[];
}

const SESSIONS = [
  { key: 'open', label: 'Open' },
  { key: 'close', label: 'Close' },
  { key: 'jodi', label: 'Jodi' },
  { key: 'half_sangam', label: 'Half Sangam' },
  { key: 'full_sangam', label: 'Full Sangam' },
];

function normalizeTables(data: Data): Table[] {
  // If backend already returned tables, use them
  if (Array.isArray(data.tables) && data.tables.length > 0) {
    return data.tables;
  }

  // Otherwise build from the flat `breakdown` array based on session
  const breakdown = data.breakdown || [];

  // Group single-digit bids vs panna bids
  const singles: Row[] = [];
  const pannas: Row[] = [];
  const other: Row[] = [];

  for (const r of breakdown) {
    // Single = 1-char digit; Panna = 3-char digit; others fall through
    const clean = String(r.digit).replace(/\D/g, '');
    if (clean.length === 1) singles.push(r);
    else if (clean.length === 3) pannas.push(r);
    else other.push(r);
  }

  switch (data.session) {
    case 'open':
    case 'close':
      return [
        { title: 'Single Digit', rows: singles },
        { title: 'Pana', rows: pannas },
      ];
    case 'jodi':
      return [{ title: 'Jodi', rows: breakdown }];
    case 'half_sangam':
      return [{ title: 'Half Sangam', rows: breakdown }];
    case 'full_sangam':
      return [{ title: 'Full Sangam', rows: breakdown }];
    default:
      return [{ title: 'Breakdown', rows: breakdown }];
  }
}

export default function OcCutting() {
  const today = todayLocal();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [date, setDate] = useState(today);
  const [marketId, setMarketId] = useState('');
  const [session, setSession] = useState('open');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [winnersModal, setWinnersModal] = useState<{ digit: string; rows: any[]; loading: boolean } | null>(null);

  useEffect(() => {
    api.get('/admin/games').then((r) => {
      setMarkets(r.data.data || []);
      if (r.data.data?.length > 0 && !marketId) setMarketId(r.data.data[0].id);
    });
  }, []);

  const load = async () => {
    if (!marketId) return;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/admin/oc-cutting', {
        params: { date, marketId, session },
      });
      setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const openWinners = async (digit: string) => {
    setWinnersModal({ digit, rows: [], loading: true });
    try {
      const { data: res } = await api.get('/admin/oc-cutting/winners', {
        params: { date, marketId, session, digit },
      });
      setWinnersModal({ digit, rows: res.data || [], loading: false });
    } catch {
      setWinnersModal({ digit, rows: [], loading: false });
    }
  };

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const copyTable = async (table: Table) => {
    let txt = `${data?.market.name} ${session.toUpperCase()}\n\n`;
    for (const r of table.rows) txt += `${r.digit}-${r.totalBids} rs.\n`;
    const total = table.rows.reduce((s, r) => s + r.totalBids, 0);
    txt += `Total - ${total} rs.\n`;
    try {
      await navigator.clipboard.writeText(txt);
      alert(`Copied ${table.title}`);
    } catch {
      alert('Copy failed');
    }
  };

  const exportTableCSV = (table: Table) => {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`Market,${data.market.name}`);
    lines.push(`Session,${data.session}`);
    lines.push(`Date,${data.date}`);
    lines.push(`Table,${table.title}`);
    lines.push('');
    lines.push('Digit,Total Bids,Amount to Pay,Profit,Loss');
    table.rows.forEach((r) => {
      lines.push(`${r.digit},${r.totalBids},${r.amountToPay},${r.profit},${r.loss}`);
    });
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.market.name}_${data.session}_${table.title.replace(/\s/g, '_')}_${data.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTablePDF = (table: Table) => {
    if (!data) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFillColor(120, 6, 6);
    doc.rect(0, 0, 210, 18, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Crorebet', 14, 12);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Market: ${data.market.name}  |  Session: ${data.session}  |  Date: ${data.date}`, 14, 24);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(table.title, 14, 32);

    autoTable(doc, {
      startY: 36,
      head: [['Digit', 'Total Bids', 'Amount to Pay', 'Profit', 'Loss']],
      body: table.rows.map((r) => [r.digit, r.totalBids, r.amountToPay, r.profit, r.loss]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [120, 6, 6], textColor: [212, 175, 55], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 245, 235] },
    });

    doc.save(`${data.market.name}_${data.session}_${table.title.replace(/\s/g, '_')}_${data.date}.pdf`);
  };

  // Normalize tables — safe against old/new backend
  const tables: Table[] = data ? normalizeTables(data) : [];

  const cards = data
    ? [
        { label: 'Single Total', value: data.summary.single.total, tone: 'warning' },
        { label: 'Single Profit', value: data.summary.single.profit, tone: 'warning' },
        { label: 'Jodi Total', value: data.summary.jodi.total, tone: 'warning' },
        { label: 'Jodi Profit', value: data.summary.jodi.profit, tone: 'warning' },
        { label: 'Pana Total', value: data.summary.pana.total, tone: 'warning' },
        { label: 'Pana Profit', value: data.summary.pana.profit, tone: 'warning' },
        { label: 'Half Sangam', value: data.summary.halfSangam.total, tone: 'warning' },
        { label: 'Half Sangam Profit', value: data.summary.halfSangam.profit, tone: 'warning' },
        { label: 'Full Sangam Total', value: data.summary.fullSangam.total, tone: 'warning' },
        { label: 'Full Sangam Profit', value: data.summary.fullSangam.profit, tone: 'warning' },
        { label: 'Total Play', value: data.summary.totalPlay, tone: 'success' },
        { label: 'Total Profit', value: data.summary.totalProfit, tone: 'success' },
      ]
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-bold text-slate-100">OC Cutting Group</h1>

      {/* FILTERS */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Game</label>
            <select className="input" value={marketId} onChange={(e) => setMarketId(e.target.value)}>
              <option value="">Select Game</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Session</label>
            <select className="input" value={session} onChange={(e) => setSession(e.target.value)}>
              {SESSIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={load} disabled={loading || !marketId} className="btn-primary w-full">
              {loading ? 'Loading...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cards.map((c, i) => {
              const isSuccess = c.tone === 'success';
              const value = c.value;
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${
                    isSuccess
                      ? 'bg-emerald-900/30 border-emerald-700/50'
                      : 'bg-amber-900/20 border-amber-700/40'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs uppercase text-slate-400 font-medium leading-tight">
                      {c.label}
                    </p>
                    {value !== 0 && (
                      <span
                        className={`text-xs font-semibold ${
                          value > 0
                            ? isSuccess
                              ? 'text-emerald-300'
                              : 'text-amber-300'
                            : 'text-red-400'
                        }`}
                      >
                        {value > 0 ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-2xl font-bold mt-2 ${
                      isSuccess ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {money(value)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* BREAKDOWN TABLES */}
          {tables.map((table) => (
            <div key={table.title} className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border flex-wrap gap-2">
                <h2 className="text-sm font-bold text-slate-200">{table.title}</h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyTable(table)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-medium"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => exportTableCSV(table)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-medium"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => exportTablePDF(table)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-medium"
                  >
                    PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {table.rows.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No data available in table</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Digit</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Total Bids</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Amount to Pay</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Profit</th>
                        <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((r) => (
                        <tr key={r.digit} className="border-t border-brand-border hover:bg-slate-800/30">
                          <td className="px-3 py-3 font-mono text-slate-200">{r.digit}</td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => openWinners(r.digit)}
                              className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                              {money(r.totalBids)}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-right text-slate-300">{money(r.amountToPay)}</td>
                          <td className="px-3 py-3 text-right text-emerald-400">{r.profit > 0 ? money(r.profit) : '0'}</td>
                          <td className="px-3 py-3 text-right text-red-400">{r.loss > 0 ? money(r.loss) : '0'}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-800/60 border-t border-brand-border font-semibold">
                        <td className="px-3 py-3 text-slate-300" colSpan={2}>
                          Total
                        </td>
                        <td className="px-3 py-3 text-right text-slate-200">
                          {money(table.rows.reduce((s, r) => s + r.totalBids, 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              <div className="px-4 py-3 border-t border-brand-border">
                <button
                  onClick={() => copyTable(table)}
                  className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded font-medium"
                >
                  Copy Data
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* WINNERS MODAL */}
      {winnersModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border">
              <h3 className="text-lg font-bold text-slate-100">
                Winners — Digit <span className="font-mono text-brand-accent">{winnersModal.digit}</span>
              </h3>
              <button onClick={() => setWinnersModal(null)} className="text-slate-400 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-auto">
              {winnersModal.loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                </div>
              ) : winnersModal.rows.length === 0 ? (
                <p className="text-center text-slate-500 py-12">No bids</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">#</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Name</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Mobile</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Type</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Bet</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Win</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winnersModal.rows.map((w: any, i: number) => (
                      <tr key={w.id} className="border-t border-brand-border">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-200">{w.userName}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">{w.userMobile}</td>
                        <td className="px-3 py-2 text-xs text-slate-400">{w.gameType}</td>
                        <td className="px-3 py-2 text-right text-slate-200">{money(w.amount)}</td>
                        <td className="px-3 py-2 text-right text-emerald-400">{money(w.payout)}</td>
                        <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(w.betDate).toLocaleString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}