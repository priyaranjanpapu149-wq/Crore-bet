import { useEffect, useState } from 'react';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { todayLocal } from '../../utils/date';

interface DepositRow {
  id: string;
  userId: string;
  amount: string;
  type: number;
  remark: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
  user: {
    mobile: string;
    name: string;
  } | null;
}

export default function Deposits() {
  const today = todayLocal();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/deposits', {
        params: { from: fromDate, to: toDate, page, limit },
      });
      setRows(data.data.rows);
      setTotal(data.data.total);
      setPages(data.data.pages);
      setTotalDeposit(data.data.totalDeposit);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, limit]);

  const applyFilter = () => {
    setPage(1);
    load();
  };

  const clearFilter = () => {
    const t = todayLocal();
    setFromDate(t);
    setToDate(t);
    setPage(1);
    setTimeout(load, 0);
  };

  // Fetch ALL rows (not just current page) for export
  const fetchAllRows = async (): Promise<{ rows: DepositRow[]; total: number }> => {
    const { data } = await api.get('/admin/deposits', {
      params: { from: fromDate, to: toDate, page: 1, limit: 10000 },
    });
    return {
      rows: data.data.rows,
      total: data.data.totalDeposit,
    };
  };

  // ---------- CSV EXPORT ----------
  const exportCSV = async () => {
    setExporting(true);
    try {
      const { rows: allRows, total: sum } = await fetchAllRows();

      // Build CSV with BOM for Excel compatibility
      const header = [
        'S.No',
        'Date',
        'Time',
        'User Name',
        'User Mobile',
        'Remark',
        'Amount (INR)',
        'Balance After',
      ];

      const csvLines: string[] = [];
      csvLines.push(header.join(','));

      allRows.forEach((r, idx) => {
        const d = new Date(r.createdAt);
        const dateStr = d.toLocaleDateString('en-GB');
        const timeStr = d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
            hour12: true,
        });

        // Escape quotes and wrap fields with commas
        const esc = (v: any) => {
          const s = String(v ?? '');
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        };

        csvLines.push(
          [
            idx + 1,
            esc(dateStr),
            esc(timeStr),
            esc(r.user?.name || 'N/A'),
            esc(r.user?.mobile || 'N/A'),
            esc(r.remark),
            esc(Number(r.amount).toFixed(2)),
            esc(Number(r.balanceAfter).toFixed(2)),
          ].join(',')
        );
      });

      // Add summary row at bottom
      csvLines.push('');
      csvLines.push(`"Total Records:",${allRows.length}`);
      csvLines.push(`"Total Deposit (INR):",${Number(sum).toFixed(2)}`);

      const csvContent = '\uFEFF' + csvLines.join('\n'); // BOM for UTF-8 Excel
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deposits_${fromDate}_to_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.response?.data?.message || 'CSV export failed');
    } finally {
      setExporting(false);
    }
  };

  // ---------- PDF EXPORT ----------
  const exportPDF = async () => {
    setExporting(true);
    try {
      const { rows: allRows, total: sum } = await fetchAllRows();

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // ---- Header branding ----
      doc.setFillColor(120, 6, 6); // deep maroon
      doc.rect(0, 0, 297, 22, 'F');

      doc.setTextColor(212, 175, 55); // gold
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Crorebet', 14, 12);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text('Deposit Transactions Report', 14, 18);

      // ---- Meta info ----
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.text(`From: ${fromDate}    To: ${toDate}`, 14, 30);
      doc.text(
        `Generated: ${new Date().toLocaleString('en-GB')}`,
        14,
        35
      );
      doc.text(
        `Total Records: ${allRows.length}    Total Deposit: INR ${Number(sum).toLocaleString('en-IN')}`,
        14,
        40
      );

      // ---- Table ----
      const body = allRows.map((r, idx) => {
        const d = new Date(r.createdAt);
        const dt = `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
            hour12: true,
        })}`;
        return [
          idx + 1,
          dt,
          r.user?.name || 'N/A',
          r.user?.mobile || 'N/A',
          r.remark,
          Number(r.amount).toLocaleString('en-IN'),
          Number(r.balanceAfter).toLocaleString('en-IN'),
        ];
      });

      autoTable(doc, {
        startY: 46,
        head: [[
          'S.No',
          'Date / Time',
          'User Name',
          'User Mobile',
          'Remark',
          'Amount (INR)',
          'Balance After',
        ]],
        body,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [120, 6, 6],
          textColor: [212, 175, 55],
          fontStyle: 'bold',
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [250, 245, 235],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 32 },
          2: { cellWidth: 30 },
          3: { cellWidth: 26 },
          4: { cellWidth: 90 },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 24, halign: 'right' },
        },
        didDrawPage: (data) => {
          // Footer with page number
          const pageCount = doc.getNumberOfPages();
          const pageNum = doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `Page ${pageNum} of ${pageCount}`,
            297 - 20,
            210 - 5,
            { align: 'right' }
          );
          doc.text(
            'Crorebet Admin — Confidential',
            14,
            210 - 5
          );
        },
      });

      doc.save(`deposits_${fromDate}_to_${toDate}.pdf`);
    } catch (e: any) {
      alert(e.response?.data?.message || 'PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  const money = (n: number | string) =>
    '₹' + Number(n || 0).toLocaleString('en-IN');

  const formatDateTime = (s: string) => {
    const d = new Date(s);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hr = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const h12 = hr % 12 || 12;
    return `${day}/${mon}/${year} ${String(h12).padStart(2, '0')}:${min} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">
          Deposit Transactions
        </h1>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={exporting || rows.length === 0}
            className="flex items-center gap-1.5 text-sm bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded font-medium disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Exporting...' : 'CSV'}
          </button>
          <button
            onClick={exportPDF}
            disabled={exporting || rows.length === 0}
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

      {/* Filter card */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">From Date</label>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">To Date</label>
            <input
              type="date"
              className="input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button onClick={applyFilter} className="btn-primary whitespace-nowrap">
            Save
          </button>
          <button
            onClick={clearFilter}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded text-sm font-medium whitespace-nowrap"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Total deposit stat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-4">
          <p className="text-xs uppercase text-blue-300 font-medium">
            Total Deposit
          </p>
          <p className="text-2xl md:text-3xl font-bold text-blue-300 mt-1">
            {money(totalDeposit)}
          </p>
          <p className="text-xs text-blue-400 mt-1">
            {total} transaction{total === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border flex-wrap gap-2">
          <h2 className="text-sm font-bold text-slate-200">Transactions</h2>
          <div className="flex items-center gap-2">
            <select
              className="text-xs bg-slate-800 border border-brand-border text-slate-300 rounded px-2 py-1.5"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
              <option value="200">200 / page</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-500 py-12">
              No deposits in this date range
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">User Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">User Mobile</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Remark</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Amount</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Balance After</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3 text-slate-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-3 py-3 text-slate-200 font-medium">
                      {r.user?.name || 'N/A'}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-300">
                      {r.user?.mobile || 'N/A'}
                    </td>
                    <td className="px-3 py-3 text-slate-300 max-w-[280px]">
                      <div className="truncate" title={r.remark}>{r.remark}</div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-emerald-400 font-semibold">
                        +{money(r.amount)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400">
                      {money(r.balanceAfter)}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDateTime(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border flex-wrap gap-2">
            <span className="text-xs text-slate-500">
              Page {page} of {pages} · {total} records
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(1)} disabled={page <= 1}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30">«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30">Next</button>
              <button onClick={() => setPage(pages)} disabled={page >= pages}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}