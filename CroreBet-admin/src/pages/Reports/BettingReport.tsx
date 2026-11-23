import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { todayLocal } from '../../utils/date';

interface Market {
  id: string;
  name: string;
  slug: string;
  openTime: string | null;
  closeTime: string | null;
  type: string;
}

function fmt12(t: string | null): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${ampm}`;
}

// 🚀 Sort helper — order by open time, then close time, then name.
//    Markets with no open time go to the bottom.
function sortMarketsByTiming(list: Market[]): Market[] {
  return [...list].sort((a, b) => {
    const aOpen = a.openTime || '99:99';
    const bOpen = b.openTime || '99:99';
    if (aOpen !== bOpen) return aOpen.localeCompare(bOpen);

    const aClose = a.closeTime || '99:99';
    const bClose = b.closeTime || '99:99';
    if (aClose !== bClose) return aClose.localeCompare(bClose);

    return a.name.localeCompare(b.name);
  });
}

export default function BettingReport() {
  const today = todayLocal();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/admin/games')
      .then((r) => setMarkets(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sortMarketsByTiming(
    markets.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase())
    )
  );

  const go = (market: Market, session: 'open' | 'close') => {
    navigate(
      `/reports/betting/${encodeURIComponent(market.name)}/${session}?date=${date}`
    );
  };

  // ---------- COPY MARKET LIST ----------
  const copyList = async () => {
    let txt = `Bid Report — Markets (${date})\n\n`;
    txt += `# | Game Name | Open Time | Close Time\n`;
    filtered.forEach((m, i) => {
      txt += `${i + 1}. ${m.name} | ${fmt12(m.openTime)} | ${fmt12(m.closeTime)}\n`;
    });
    try {
      await navigator.clipboard.writeText(txt);
      alert('Copied');
    } catch {
      alert('Copy failed');
    }
  };

  // ---------- CSV MARKET LIST ----------
  const exportCSV = () => {
    const lines: string[] = [];
    lines.push(`Bid Report — Markets`);
    lines.push(`Date,${date}`);
    lines.push('');
    lines.push('#,Game Name,Open Time,Close Time');
    filtered.forEach((m, i) => {
      lines.push(
        [i + 1, `"${m.name}"`, `"${fmt12(m.openTime)}"`, `"${fmt12(m.closeTime)}"`].join(',')
      );
    });
    lines.push('');
    lines.push(`Total Markets,${filtered.length}`);
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bid_report_markets_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- PDF MARKET LIST ----------
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(120, 6, 6);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Magicboss', 14, 12);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Bid Report — Markets', 14, 17);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Date: ${date}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 33);
    doc.text(`Total Markets: ${filtered.length}`, 14, 38);

    autoTable(doc, {
      startY: 44,
      head: [['#', 'Game Name', 'Open Time', 'Close Time']],
      body: filtered.map((m, i) => [
        i + 1,
        m.name,
        fmt12(m.openTime),
        fmt12(m.closeTime),
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: [120, 6, 6],
        textColor: [212, 175, 55],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 245, 235] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 90 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
      },
    });
    doc.save(`bid_report_markets_${date}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Bid Report</h1>
          <p className="text-xs text-slate-500 mt-1">
            Click a market to view open / close bids · sorted by open time
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyList}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded font-medium disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded font-medium disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-sm bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded font-medium disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Date + search */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-slate-500">Date</label>
          <input
            type="date"
            className="input w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="text"
            className="input flex-1 min-w-[200px]"
            placeholder="Search market..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Market list table */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No markets found</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Open Time</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Close Time</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Open Bid</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Close Bid</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-3 text-slate-100 font-semibold uppercase">{m.name}</td>
                    <td className="px-3 py-3 text-slate-300 font-mono text-xs">{fmt12(m.openTime)}</td>
                    <td className="px-3 py-3 text-slate-300 font-mono text-xs">{fmt12(m.closeTime)}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => go(m, 'open')}
                        className="text-blue-400 hover:text-blue-300 underline font-medium"
                      >
                        View open bid
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => go(m, 'close')}
                        className="text-blue-400 hover:text-blue-300 underline font-medium"
                      >
                        View close bid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-2 border-t border-brand-border text-xs text-slate-500">
          Showing {filtered.length} of {markets.length} markets · sorted by open time
        </div>
      </div>
    </div>
  );
}