import { useEffect, useState } from 'react';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { todayLocal } from '../../utils/date';

interface BetRow {
  id: string;
  index: number;
  userName: string;
  userMobile: string;
  points: number;
  gameName: string;
  number: string;
  marketName: string;
  createdAt: string;
}

interface Market {
  id: string;
  name: string;
}

export default function BetFilter() {
  const today = todayLocal();

  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [market, setMarket] = useState('');
  const [rows, setRows] = useState<BetRow[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Load market list once
  useEffect(() => {
    api
      .get('/admin/games')
      .then((r) => setMarkets(r.data.data || []))
      .catch(() => {});
  }, []);

  const load = async () => {
    if (!date) return setError('Date is required');
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const { data } = await api.get('/admin/reports/bet-filter', {
        params: {
          date,
          market: market || undefined,
          amount: amount !== '' ? amount : undefined,
        },
      });
      setRows(data.data.rows);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const totalPoints = rows.reduce((s, r) => s + r.points, 0);
  const hasData = rows.length > 0;

  // ---------- COPY ----------
  const copyAll = async () => {
    if (!hasData) {
      alert('No data to copy. Run a search first.');
      return;
    }
    let txt = `Bet Report\nDate: ${date}\nAmount filter: ${amount || 'any'}\nMarket: ${market || 'all'}\n\n`;
    txt += `#\tUser Name\tMobile\tPoints\tGame Name\tNumber\tCreated at\n`;
    rows.forEach((r) => {
      txt += `${r.index}\t${r.userName}\t${r.userMobile}\t${r.points}\t${r.gameName}\t${r.number}\t${new Date(r.createdAt).toLocaleString('en-GB')}\n`;
    });
    txt += `\nTotal Points: ${totalPoints}\n`;
    try {
      await navigator.clipboard.writeText(txt);
      alert('Copied');
    } catch {
      alert('Copy failed');
    }
  };

  // ---------- CSV ----------
  const exportCSV = () => {
    if (!hasData) {
      alert('No data to export. Run a search first.');
      return;
    }
    const lines: string[] = [];
    lines.push('Bet Report');
    lines.push(`Date,${date}`);
    lines.push(`Amount,${amount || 'any'}`);
    lines.push(`Market,${market || 'all'}`);
    lines.push('');
    lines.push('#,User Name,Mobile,Points,Game Name,Number,Created at');
    rows.forEach((r) => {
      lines.push(
        `${r.index},"${r.userName}","${r.userMobile}",${r.points},"${r.gameName}","${r.number}","${new Date(r.createdAt).toLocaleString('en-GB')}"`
      );
    });
    lines.push('');
    lines.push(`Total,${totalPoints}`);
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bet_report_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- PDF ----------
  const exportPDF = () => {
    if (!hasData) {
      alert('No data to export. Run a search first.');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(120, 6, 6);
    doc.rect(0, 0, 297, 20, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Magicboss', 14, 12);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Bet Report', 14, 17);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(
      `Date: ${date}  |  Amount: ${amount || 'any'}  |  Market: ${market || 'all'}  |  Records: ${rows.length}`,
      14,
      28
    );
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 33);

    autoTable(doc, {
      startY: 38,
      head: [['#', 'User Name', 'Mobile', 'Points', 'Game Name', 'Number', 'Created at']],
      body: rows.map((r) => [
        String(r.index),
        r.userName,
        r.userMobile,
        money(r.points),
        r.gameName,
        r.number,
        new Date(r.createdAt).toLocaleString('en-GB'),
      ]),
      foot: [['', '', '', `Total: ${money(totalPoints)}`, '', '', '']],
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
    doc.save(`bet_report_${date}.pdf`);
  };

  // ---------- PRINT ----------
  const printReport = () => {
    if (!hasData) {
      alert('No data to print. Run a search first.');
      return;
    }
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `
      <html><head><title>Bet Report - ${date}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #780606; margin: 0; }
        h2 { color: #333; margin: 4px 0 16px; font-size: 14px; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
        th { background: #780606; color: #d4af37; }
        tr:nth-child(even) { background: #faf5eb; }
        tfoot td { background: #f5f5f5; font-weight: bold; }
      </style></head><body>
        <h1>Magicboss</h1>
        <h2>Bet Report · Date: ${date} · Amount: ${amount || 'any'} · Market: ${market || 'all'} · Records: ${rows.length}</h2>
        <table>
          <thead><tr>
            <th>#</th><th>User Name</th><th>Mobile</th><th>Points</th>
            <th>Game Name</th><th>Number</th><th>Created at</th>
          </tr></thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
              <td>${r.index}</td>
              <td>${r.userName}</td>
              <td>${r.userMobile}</td>
              <td>${money(r.points)}</td>
              <td>${r.gameName}</td>
              <td>${r.number}</td>
              <td>${new Date(r.createdAt).toLocaleString('en-GB')}</td>
            </tr>`
              )
              .join('')}
          </tbody>
          <tfoot><tr>
            <td colspan="3"></td>
            <td>Total: ${money(totalPoints)}</td>
            <td colspan="3"></td>
          </tr></tfoot>
        </table>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <div className="space-y-4">
      {/* Header — buttons ALWAYS colored */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">
            Bet Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Filter bets by date, amount, and market
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
            <label className="text-xs text-slate-500 mb-1 block">Amount</label>
            <input
              type="number"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Any"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Game</label>
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

      {/* Summary */}
      {hasSearched && !loading && hasData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
            <p className="text-xs uppercase text-slate-500 font-medium">
              Total Bids
            </p>
            <p className="text-xl md:text-2xl font-bold text-brand-accent mt-1">
              {rows.length}
            </p>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
            <p className="text-xs uppercase text-slate-500 font-medium">
              Total Points
            </p>
            <p className="text-xl md:text-2xl font-bold text-emerald-400 mt-1">
              {money(totalPoints)}
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
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Points</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game Name</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Number</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Created at</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : !hasSearched ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-500 py-12">
                    Set filters above and click Submit
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-500 py-12">
                    No bets found for the selected filters
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-brand-border hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-3 py-3 text-slate-500">{r.index}</td>
                    <td className="px-3 py-3 text-slate-200 font-medium">{r.userName}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">{r.userMobile}</td>
                    <td className="px-3 py-3 text-right text-amber-400 font-bold">
                      {money(r.points)}
                    </td>
                    <td className="px-3 py-3 text-slate-300">{r.gameName}</td>
                    <td className="px-3 py-3 font-mono text-slate-200">{r.number}</td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('en-GB', {
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
            {hasData && (
              <tfoot>
                <tr className="border-t-2 border-brand-border bg-slate-800/40">
                  <td colSpan={3} className="px-3 py-3 text-xs text-slate-400 font-medium">
                    Total ({rows.length} bids)
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-400">
                    {money(totalPoints)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}