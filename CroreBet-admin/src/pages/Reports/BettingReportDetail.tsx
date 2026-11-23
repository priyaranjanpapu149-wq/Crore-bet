import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { todayLocal } from '../../utils/date';

interface ColumnData {
  total: number;
  rows: { digit: string; amount: number }[];
}
interface Data {
  market: { id: string; name: string };
  date: string;
  session: string;
  columns: Record<string, ColumnData>;
}

// ─── Column layout ────────────────────────────────────────
// All 15 columns render in BOTH OPEN and CLOSE reports.
//   • Session-based games (single, panna, odd_even, motors,
//     family_panna, cycle_patti, sp_dp_tp) are filtered by session.
//   • Sessionless games (jodi, group_jodi, red_bracket,
//     half_sangam_a, full_sangam) are shown in both reports because
//     they can only be placed before market open time.
const SESSION_COLUMNS = [
  { key: 'single',       label: 'Single Digit'  },
  { key: 'single_panna', label: 'Single Pana'   },
  { key: 'double_panna', label: 'Double Pana'   },
  { key: 'triple_panna', label: 'Triple Pana'   },
  { key: 'family_panna', label: 'Family Panna'  },
  { key: 'cycle_patti',  label: 'Cycle Patti'   },
  { key: 'sp_motor',     label: 'SP Motor'      },
  { key: 'dp_motor',     label: 'DP Motor'      },
  { key: 'odd_even',     label: 'Odd Even'      },
];

const SESSIONLESS_COLUMNS = [
  { key: 'jodi',          label: 'Jodi Digit'   },
  { key: 'group_jodi',    label: 'Group Jodi'   },
  { key: 'red_bracket',   label: 'Red Bracket'  },
  { key: 'half_sangam_a', label: 'Half Sangam'  },
  { key: 'full_sangam',   label: 'Full Sangam'  },
  { key: 'sp_dp_tp',      label: 'SP DP TP'     },
];

export default function BettingReportDetail() {
  const { marketName, session } = useParams<{
    marketName: string;
    session: string;
  }>();
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || todayLocal();
  const navigate = useNavigate();

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🚀 All 15 columns always render — in both OPEN and CLOSE reports.
  //    Grand Total is the sum of whatever is visible.
  const COLUMNS = [...SESSION_COLUMNS, ...SESSIONLESS_COLUMNS];

  useEffect(() => {
    if (!marketName) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await api.get('/admin/games');
        const market = (list.data.data as any[]).find(
          (m) => m.name.toLowerCase() === decodeURIComponent(marketName).toLowerCase()
        );
        if (!market) {
          setError('Market not found');
          setLoading(false);
          return;
        }
        const { data: res } = await api.get('/admin/betting-report', {
          params: { date, marketId: market.id, session },
        });
        setData(res.data);
      } catch (e: any) {
        setError(e.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [marketName, session, date]);

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const maxRows = data
    ? Math.max(...COLUMNS.map((c) => data.columns[c.key]?.rows.length || 0), 0)
    : 0;

  const grandTotal = data
    ? COLUMNS.reduce((s, c) => s + (data.columns[c.key]?.total || 0), 0)
    : 0;

  const copyAll = async () => {
    if (!data) return;
    let txt = `${data.market.name} ${session?.toUpperCase()} — ${date}\n\n`;
    for (const c of COLUMNS) {
      const col = data.columns[c.key];
      if (!col || col.rows.length === 0) continue;
      txt += `--- ${c.label} ---\n`;
      for (const r of col.rows) txt += `${r.digit} - ${r.amount} rs.\n`;
      txt += `Total: ${col.total} rs.\n\n`;
    }
    try {
      await navigator.clipboard.writeText(txt);
      alert('Copied');
    } catch {
      alert('Copy failed');
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`Market,${data.market.name}`);
    lines.push(`Session,${data.session}`);
    lines.push(`Date,${data.date}`);
    lines.push('');
    lines.push(COLUMNS.map((c) => c.label).join(','));
    lines.push(COLUMNS.map((c) => data.columns[c.key]?.total ?? 0).join(','));
    lines.push('');
    for (let i = 0; i < maxRows; i++) {
      lines.push(
        COLUMNS.map((c) => {
          const row = data.columns[c.key]?.rows[i];
          return row ? `"${row.digit} - ${row.amount}"` : '""';
        }).join(',')
      );
    }
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bid_report_${data.market.name}_${data.session}_${data.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!data) return;
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
    doc.text('Bid Report', 14, 17);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(
      `Market: ${data.market.name} | Session: ${data.session} | Date: ${data.date}`,
      14,
      28
    );
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 33);

    const head = [COLUMNS.map((c) => c.label)];
    const totalRow = COLUMNS.map((c) => `Total: ${data.columns[c.key]?.total ?? 0}`);
    const body: string[][] = [totalRow];
    for (let i = 0; i < maxRows; i++) {
      body.push(
        COLUMNS.map((c) => {
          const row = data.columns[c.key]?.rows[i];
          return row ? `${row.digit} - ${row.amount}` : '';
        })
      );
    }
    autoTable(doc, {
      startY: 38,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: {
        fillColor: [120, 6, 6],
        textColor: [212, 175, 55],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 245, 235] },
    });
    doc.save(`bid_report_${data.market.name}_${data.session}_${data.date}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 uppercase">
              {marketName} — <span className="text-brand-accent">{session}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">Bid Report · {date}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyAll}
            disabled={!data}
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
            disabled={!data}
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
            disabled={!data}
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

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="text-slate-100 font-medium">{data.market.name}</span>
              <span className="mx-2">·</span>
              <span className="text-brand-accent uppercase">{data.session}</span>
              <span className="mx-2">·</span>
              <span>{data.date}</span>
            </p>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead className="bg-slate-800/70 sticky top-0 z-10">
                  <tr>
                    {COLUMNS.map((c, idx) => (
                      <th
                        key={c.key}
                        className={`text-left px-3 py-3 text-xs font-semibold text-brand-accent uppercase whitespace-nowrap border-b border-brand-border ${
                          idx === 0 ? 'sticky left-0 bg-slate-800/70 z-20' : ''
                        }`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-800/40">
                    {COLUMNS.map((c, idx) => {
                      const total = data.columns[c.key]?.total ?? 0;
                      return (
                        <th
                          key={`t-${c.key}`}
                          className={`text-left px-3 py-2 text-xs font-bold text-emerald-300 whitespace-nowrap border-b border-brand-border ${
                            idx === 0 ? 'sticky left-0 bg-slate-800/40 z-20' : ''
                          }`}
                        >
                          Total: {money(total)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {maxRows === 0 ? (
                    <tr>
                      <td
                        colSpan={COLUMNS.length}
                        className="text-center text-slate-500 py-12"
                      >
                        No bids for this market / date / session
                      </td>
                    </tr>
                  ) : (
                    Array.from({ length: maxRows }).map((_, i) => (
                      <tr
                        key={i}
                        className="border-t border-brand-border hover:bg-slate-800/30"
                      >
                        {COLUMNS.map((c, idx) => {
                          const row = data.columns[c.key]?.rows[i];
                          return (
                            <td
                              key={`${c.key}-${i}`}
                              className={`px-3 py-2 whitespace-nowrap ${
                                idx === 0
                                  ? 'sticky left-0 bg-brand-card hover:bg-slate-800/30 z-10'
                                  : ''
                              }`}
                            >
                              {row ? (
                                <span>
                                  <span className="font-mono text-slate-200">
                                    {row.digit}
                                  </span>
                                  <span className="text-slate-500 mx-1">-</span>
                                  <span className="text-emerald-400">
                                    {row.amount}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-700">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}