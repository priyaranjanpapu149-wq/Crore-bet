import { todayLocal, toLocalDateString } from '../../utils/date';
import { useEffect, useState } from 'react';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Row {
  id: string;
  userName: string;
  userMobile: string;
  type: string;
  amount: number;
  remark: string;
  createdAt: string;
}
interface Data {
  date: { from: string; to: string };
  summary: { totalDeposit: number; totalWithdraw: number; profit: number };
  rows: Row[];
}

const todayStr = () => todayLocal();
const weekAgoStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return toLocalDateString(d);
};

export default function ProfitLoss() {
  const [from, setFrom] = useState(weekAgoStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/admin/reports/profit-loss', {
        params: { from, to },
      });
      setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  // ---------- COPY ----------
  const copyAll = async () => {
    if (!data) return;
    let txt = `Profit & Loss Report\n`;
    txt += `Period: ${data.date.from} to ${data.date.to}\n\n`;
    txt += `Today's Deposit: ${data.summary.totalDeposit}\n`;
    txt += `Withdrawal: ${data.summary.totalWithdraw}\n`;
    txt += `Total Profit: ${data.summary.profit}\n\n`;
    txt += `#\tUser Name\tUser Mobile\tType\tAmount\n`;
    data.rows.forEach((r, i) => {
      txt += `${i + 1}\t${r.userName}\t${r.userMobile}\t${r.type}\t${r.amount}\n`;
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
    if (!data) return;
    const lines: string[] = [];
    lines.push('Profit & Loss Report');
    lines.push(`From,${data.date.from}`);
    lines.push(`To,${data.date.to}`);
    lines.push('');
    lines.push(`Today's Deposit,${data.summary.totalDeposit}`);
    lines.push(`Withdrawal,${data.summary.totalWithdraw}`);
    lines.push(`Total Profit,${data.summary.profit}`);
    lines.push('');
    lines.push('#,User Name,User Mobile,Type,Amount');
    data.rows.forEach((r, i) => {
      lines.push(`${i + 1},${r.userName},${r.userMobile},${r.type},${r.amount}`);
    });
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit_loss_${data.date.from}_to_${data.date.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- PDF ----------
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
    doc.text('Profit & Loss Report', 14, 17);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Period: ${data.date.from} to ${data.date.to}`, 14, 28);
    doc.text(
      `Deposit: ${money(data.summary.totalDeposit)}  |  Withdrawal: ${money(
        data.summary.totalWithdraw
      )}  |  Profit: ${money(data.summary.profit)}`,
      14,
      33
    );

    autoTable(doc, {
      startY: 38,
      head: [['#', 'User Name', 'User Mobile', 'Type', 'Amount']],
      body: data.rows.map((r, i) => [
        String(i + 1),
        r.userName,
        r.userMobile,
        r.type,
        money(r.amount),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [120, 6, 6],
        textColor: [212, 175, 55],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [250, 245, 235] },
    });
    doc.save(`profit_loss_${data.date.from}_to_${data.date.to}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* ===================== HEADER (unchanged dark theme) ===================== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">
            Profit / Loss Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deposits vs withdrawals across a date range
          </p>
        </div>
        {data && (
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
          </div>
        )}
      </div>

      {/* ===================== FILTERS (unchanged dark theme) ===================== */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">From Date</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">To Date</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2 flex-wrap">
            <button onClick={load} disabled={loading} className="btn-primary">
              {loading ? 'Loading...' : 'Apply Filter'}
            </button>
            <button
              onClick={() => {
                setFrom(weekAgoStr());
                setTo(todayStr());
              }}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const d = new Date();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                setFrom(`${d.getFullYear()}-${m}-01`);
                setTo(todayStr());
              }}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ===================== REVISED: 3 summary boxes (Dark & Colorful) ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deposit Box - Sky Blue Accent */}
        <div className="bg-brand-card border border-brand-border border-t-4 border-t-sky-500 rounded-lg shadow-sm p-6 text-center">
          <p className="text-3xl md:text-4xl font-bold text-sky-400">
            {data ? money(data.summary.totalDeposit) : '₹0'}
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">
            Today's Deposit
          </p>
        </div>

        {/* Withdrawal Box - Amber/Yellow Accent */}
        <div className="bg-brand-card border border-brand-border border-t-4 border-t-amber-500 rounded-lg shadow-sm p-6 text-center">
          <p className="text-3xl md:text-4xl font-bold text-amber-400">
            {data ? money(data.summary.totalWithdraw) : '₹0'}
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">
            Withdrawal
          </p>
        </div>

        {/* Profit Box - Emerald Green Accent */}
        <div className="bg-brand-card border border-brand-border border-t-4 border-t-emerald-500 rounded-lg shadow-sm p-6 text-center">
          <p className="text-3xl md:text-4xl font-bold text-emerald-400">
            {data ? money(data.summary.profit) : '₹0'}
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">
            Total Profit
          </p>
        </div>
      </div>

      {/* ===================== REVISED: transaction table (Dark Theme) ===================== */}
      <div className="bg-brand-card rounded-lg border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60 border-b border-brand-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">#</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">User Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">User Mobile</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Type</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-300">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : !data || data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">
                    No records found
                  </td>
                </tr>
              ) : (
                data.rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-brand-border/40 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-200 font-medium">{r.userName}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {r.userMobile}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.type === 'Credit'
                            ? 'text-emerald-400 font-medium'
                            : 'text-red-400 font-medium'
                        }
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200 font-semibold">
                      {money(r.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}