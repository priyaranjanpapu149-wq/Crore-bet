import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------- Date helper ----------
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface BankInfo {
  holderName: string | null;
  accountNo: string | null;
  ifsc: string | null;
  upi: string | null;
  phonepe: string | null;
  gpay: string | null;
  paytm: string | null;
}

interface WithdrawRow {
  id: string;
  index: number;
  userName: string;
  userMobile: string;
  userId: string | null;
  currentWallet: number;
  amount: number;
  requestNo: string;
  date: string;
  acceptedAt: string | null;
  status: string;
  remark: string | null;
  bank: BankInfo | null;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Accepted (default)' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const fmtDateTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

export default function WithdrawReport() {
  const today = todayLocal();

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [rows, setRows] = useState<WithdrawRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<WithdrawRow | null>(null);
  const [lifetime, setLifetime] = useState({ amount: 0, count: 0 });
  // 🚀 Filtered totals (all rows matching current filter, all pages)
  const [filtered, setFiltered] = useState({ amount: 0, count: 0 });
  // 🚀 Today's approved total (independent of filter)
  const [todayApproved, setTodayApproved] = useState({ amount: 0, count: 0 });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/reports/withdraw', {
        params: {
          page,
          limit,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          search: search || undefined,
        },
      });
      setRows(data.data.rows);
      setTotal(data.data.total);
      setPages(data.data.pages);
      setLifetime({
        amount: data.data.lifetimeApproved,
        count: data.data.lifetimeCount,
      });
      setFiltered({
        amount: Number(data.data.filteredAmount || 0),
        count: Number(data.data.filteredCount || 0),
      });
      // 🚀 Today's approved (from backend, independent of filter)
      setTodayApproved({
        amount: Number(data.data.todayApprovedAmount || 0),
        count: Number(data.data.todayApprovedCount || 0),
      });
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
      setRows([]);
      setFiltered({ amount: 0, count: 0 });
      setTodayApproved({ amount: 0, count: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, from, to, search]);

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const pageTotal = rows.reduce((s, r) => s + r.amount, 0);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      approved: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
      pending: 'bg-amber-900/50 text-amber-300 border-amber-700',
      rejected: 'bg-red-900/50 text-red-300 border-red-700',
    };
    return map[s] || 'bg-slate-700 text-slate-300 border-slate-600';
  };

  // ---------- COPY ----------
  const copyAll = async () => {
    if (!rows.length) return alert('No data to copy');
    let txt = `Withdraw Report\nFrom: ${from}  To: ${to}\nStatus: ${status || 'approved'}\n\n`;
    txt += `#\tUser Name\tMobile\tPoints\tRequest No\tDate\tStatus\n`;
    rows.forEach((r) => {
      txt += `${r.index}\t${r.userName}\t${r.userMobile}\t${r.amount}\t${r.requestNo}\t${fmtDateTime(r.date)}\t${r.status}\n`;
    });
    txt += `\nPage Total: ${pageTotal}\n`;
    txt += `Filtered Total: ${filtered.amount} (${filtered.count} requests)\n`;
    txt += `Today Approved: ${todayApproved.amount} (${todayApproved.count} requests)\n`;
    txt += `Lifetime Approved: ${lifetime.amount}\n`;
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
    lines.push('Withdraw Report');
    lines.push(`From,${from}`);
    lines.push(`To,${to}`);
    lines.push(`Status,${status || 'approved'}`);
    lines.push('');
    lines.push('#,User Name,Mobile,Points,Request No,Date,Status,Remark');
    rows.forEach((r) => {
      lines.push(
        `${r.index},"${r.userName}","${r.userMobile}",${r.amount},"${r.requestNo}","${fmtDateTime(r.date)}","${r.status}","${r.remark || ''}"`
      );
    });
    lines.push('');
    lines.push(`Page Total,${pageTotal}`);
    lines.push(`Filtered Total,${filtered.amount}`);
    lines.push(`Filtered Count,${filtered.count}`);
    lines.push(`Today Approved,${todayApproved.amount}`);
    lines.push(`Today Approved Count,${todayApproved.count}`);
    lines.push(`Lifetime Approved,${lifetime.amount}`);
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdraw_report_${from}_to_${to}.csv`;
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
    doc.text('Withdraw Report', 14, 17);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(
      `From: ${from}  |  To: ${to}  |  Status: ${status || 'approved'}  |  Records: ${rows.length}`,
      14,
      28
    );
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 33);

    autoTable(doc, {
      startY: 38,
      head: [['#', 'User Name', 'Mobile', 'Points', 'Request No', 'Date', 'Status']],
      body: rows.map((r) => [
        String(r.index),
        r.userName,
        r.userMobile,
        money(r.amount),
        r.requestNo,
        fmtDateTime(r.date),
        r.status,
      ]),
      foot: [[
        '',
        '',
        '',
        `Page: ${money(pageTotal)}`,
        `Filtered: ${money(filtered.amount)}`,
        '',
        `Today: ${money(todayApproved.amount)}`,
      ]],
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
    doc.save(`withdraw_report_${from}_to_${to}.pdf`);
  };

  // ---------- PRINT ----------
  const printReport = () => {
    if (!rows.length) return alert('No data to print');
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `
      <html><head><title>Withdraw Report ${from} - ${to}</title>
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
        <h2>Withdraw Report · From: ${from} · To: ${to} · Status: ${status || 'approved'} · Records: ${rows.length}</h2>
        <table>
          <thead><tr>
            <th>#</th><th>User Name</th><th>Mobile</th><th>Points</th>
            <th>Request No</th><th>Date</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
              <td>${r.index}</td>
              <td>${r.userName}</td>
              <td>${r.userMobile}</td>
              <td>${money(r.amount)}</td>
              <td>${r.requestNo}</td>
              <td>${fmtDateTime(r.date)}</td>
              <td>${r.status}</td>
            </tr>`
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Page Total</td>
              <td>${money(pageTotal)}</td>
              <td colspan="3">Filtered: ${money(filtered.amount)} (${filtered.count})</td>
            </tr>
            <tr>
              <td colspan="3">Today Approved</td>
              <td>${money(todayApproved.amount)}</td>
              <td colspan="3">${todayApproved.count} requests today</td>
            </tr>
          </tfoot>
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
            Withdraw Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {status || 'approved'} · {total} filtered request{total !== 1 ? 's' : ''} ·{' '}
            {money(filtered.amount)} filtered total
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Search (mobile / name)
            </label>
            <input
              className="input"
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
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setSearch(searchInput);
                setPage(1);
              }}
              className="btn-primary flex-1"
            >
              Search
            </button>
            <button
              onClick={() => {
                setFrom(today);
                setTo(today);
                setStatus('');
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
            >
              Reset
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

      {/* 🚀 Summary strip — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Lifetime Approved — all-time */}
        <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
          <p className="text-xs uppercase text-slate-500 font-medium">
            Lifetime Approved
          </p>
          <p className="text-xl md:text-2xl font-bold text-emerald-400 mt-1">
            {money(lifetime.amount)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {lifetime.count} requests
          </p>
        </div>

        {/* Filtered Total — based on current filter */}
        <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
          <p className="text-xs uppercase text-slate-500 font-medium">
            Filtered Total
          </p>
          <p className="text-xl md:text-2xl font-bold text-brand-accent mt-1">
            {money(filtered.amount)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {filtered.count} {status || 'approved'} request
            {filtered.count !== 1 ? 's' : ''}
          </p>
        </div>

        {/* 🚀 Today Approved — independent of filter */}
        <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
          <p className="text-xs uppercase text-slate-500 font-medium">
            Today Approved
          </p>
          <p className="text-xl md:text-2xl font-bold text-amber-400 mt-1">
            {money(todayApproved.amount)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {todayApproved.count} request{todayApproved.count !== 1 ? 's' : ''} today
          </p>
        </div>
      </div>

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
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Request No.</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase">View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500 py-12">
                    No withdraw requests found
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-brand-border hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-3 py-3 text-slate-500">{r.index}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-medium">
                          {r.userName}
                        </span>
                        {r.userId && (
                          <Link
                            to={`/users/${r.userId}`}
                            className="text-brand-accent hover:text-yellow-400 text-xs"
                            title="View user profile"
                          >
                            🔗
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">
                      {r.userMobile}
                    </td>
                    <td className="px-3 py-3 text-right text-amber-400 font-bold">
                      {money(r.amount)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">
                      #{r.requestNo}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {fmtDateTime(r.date)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border capitalize ${statusBadge(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setSelected(r)}
                        className="text-brand-accent hover:text-yellow-400 text-lg"
                        title="View details"
                      >
                        👁
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-brand-border bg-slate-800/40">
                  <td colSpan={3} className="px-3 py-3 text-xs text-slate-400 font-medium">
                    Page Total ({rows.length} rows)
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-400">
                    {money(pageTotal)}
                  </td>
                  <td colSpan={4}></td>
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
              <span className="text-xs text-slate-500 ml-2">{total} rows</span>
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

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-brand-card border-2 border-brand-accent rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border sticky top-0 bg-brand-card z-10">
              <h2 className="text-lg font-bold text-brand-accent">
                Withdraw Request Details
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-brand-border rounded-lg overflow-hidden">
                <Cell
                  label="User Name"
                  value={selected.userName}
                  linkTo={selected.userId ? `/users/${selected.userId}` : undefined}
                />
                <Cell label="Mobile" value={selected.userMobile} mono />
                <Cell
                  label="Request Points"
                  value={money(selected.amount)}
                  highlight
                />
                <Cell
                  label="Request Number"
                  value={`#${selected.requestNo}`}
                  mono
                />
                <Cell
                  label="Payment Method"
                  value={
                    selected.bank?.upi
                      ? 'UPI'
                      : selected.bank?.accountNo
                      ? 'Bank'
                      : '—'
                  }
                />
                <Cell
                  label="Current Wallet"
                  value={money(selected.currentWallet)}
                />
                <Cell
                  label="Status"
                  value={selected.status}
                  capitalize
                />
                <Cell label="Request Date" value={fmtDateTime(selected.date)} />
                <Cell label="Paytm" value={selected.bank?.paytm || '—'} />
                <Cell label="PhonePe" value={selected.bank?.phonepe || '—'} />
                <Cell label="GPay" value={selected.bank?.gpay || '—'} />
                <Cell label="UPI" value={selected.bank?.upi || '—'} />
                <Cell
                  label="A/C Holder Name"
                  value={selected.bank?.holderName || '—'}
                />
                <Cell
                  label="A/C Number"
                  value={selected.bank?.accountNo || '—'}
                  mono
                />
                <Cell label="IFSC" value={selected.bank?.ifsc || '—'} mono />
                <Cell
                  label="Accepted At"
                  value={fmtDateTime(selected.acceptedAt)}
                />
                {selected.remark && (
                  <div className="col-span-full bg-slate-800/40 px-4 py-3 border-t border-brand-border">
                    <p className="text-xs uppercase text-slate-500 mb-1">
                      Remark
                    </p>
                    <p className="text-sm text-slate-200">{selected.remark}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  highlight,
  mono,
  capitalize,
  linkTo,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  capitalize?: boolean;
  linkTo?: string;
}) {
  return (
    <div className="border-b border-r border-brand-border/60 p-3">
      <p className="text-xs uppercase text-slate-500 mb-1">{label}</p>
      <p
        className={`text-sm ${
          highlight ? 'text-amber-400 font-bold' : 'text-slate-200'
        } ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}
      >
        {value}
        {linkTo && (
          <Link
            to={linkTo}
            className="ml-2 text-brand-accent hover:text-yellow-400 text-xs"
          >
            🔗
          </Link>
        )}
      </p>
    </div>
  );
}