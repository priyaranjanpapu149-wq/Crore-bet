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

interface Transaction {
  id: string;
  user: { mobile: string; name: string } | null;
  amount: number;
  type: number; // 1 for credit, 0 for debit
  remark: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  // 🚀 Bid details (populated only for bid-linked transactions)
  digits?: string | null;
  gameType?: string | null;
  marketName?: string | null;
  bidStatus?: string | null;
  session?: string | null; // 'open' | 'close' | null
}

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

// 🚀 Build a combined "remark + digits + session" display string
function displayRemark(t: Transaction): string {
  const parts: string[] = [t.remark];
  if (t.digits && t.digits.length > 0) parts.push(`— ${t.digits}`);
  if (t.session && t.session.length > 0) parts.push(`· ${t.session.toUpperCase()}`);
  return parts.join(' ');
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/transactions', {
        params: {
          page,
          limit,
          search: search || undefined,
          type: typeFilter || undefined,
        },
      });
      setTransactions(data.data.rows);
      setTotal(data.data.total);
      setPages(data.data.pages);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, typeFilter]);

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  // ---------- Exports ----------
  const copyAll = async () => {
    if (!transactions.length) return alert('No data to copy');
    let txt = 'Transaction Data\n\n';
    txt += '#\tUser\tAmount\tRemark\tDate\n';
    transactions.forEach((t, idx) => {
      const userName = t.user?.name || 'N/A';
      const userMobile = t.user?.mobile || 'N/A';
      txt += `${(page - 1) * limit + idx + 1}\t${userName} (${userMobile})\t${t.amount}\t${displayRemark(t)}\t${fmtDateTime(t.createdAt)}\n`;
    });
    try {
      await navigator.clipboard.writeText(txt);
      alert('Copied');
    } catch {
      alert('Copy failed');
    }
  };

  const exportCSV = () => {
    if (!transactions.length) return alert('No data to export');
    const lines: string[] = [];
    lines.push('Transaction Data');
    lines.push(`Exported,${new Date().toLocaleString('en-GB')}`);
    lines.push('');
    lines.push('#,User,Amount,Remark,Date');
    transactions.forEach((t, idx) => {
      const userName = t.user?.name || 'N/A';
      const userMobile = t.user?.mobile || 'N/A';
      lines.push(
        `${(page - 1) * limit + idx + 1},"${userName} (${userMobile})",${t.amount},"${displayRemark(t)}","${fmtDateTime(t.createdAt)}"`
      );
    });
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${todayLocal()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!transactions.length) return alert('No data to export');
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
    doc.text('Transaction Data', 14, 17);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleString('en-GB')} | Records: ${transactions.length}`,
      14,
      28
    );

    autoTable(doc, {
      startY: 38,
      head: [['#', 'User', 'Amount', 'Remark', 'Date']],
      body: transactions.map((t, idx) => [
        String((page - 1) * limit + idx + 1),
        `${t.user?.name || 'N/A'} (${t.user?.mobile || 'N/A'})`,
        money(t.amount),
        displayRemark(t),
        fmtDateTime(t.createdAt),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [120, 6, 6], textColor: [212, 175, 55], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 245, 235] },
    });
    doc.save(`transactions_${todayLocal()}.pdf`);
  };

  // ---------- Pagination ----------
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
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">
          Transaction Data
        </h1>
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
      </div>

      {/* Filters */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input"
            placeholder="Search user (mobile/name)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <button onClick={loadTransactions} className="btn-primary">
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">
                  #
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">
                  User
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Amount
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Remark
                </th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500 py-12">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr
                    key={t.id}
                    className="border-t border-brand-border hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-3 text-slate-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        to={`/users/${t.user?.mobile}`}
                        className="text-brand-accent hover:underline"
                      >
                        {t.user?.name || 'N/A'}
                      </Link>
                      <div className="text-xs text-slate-500 font-mono">
                        {t.user?.mobile || 'N/A'}
                      </div>
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-medium ${
                        t.type === 1 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {t.type === 1 ? '+' : '−'}
                      {money(t.amount)}
                    </td>
                    {/* 🚀 REMARK column — now shows digits + session inline */}
                    <td className="px-3 py-3 text-slate-300">
                      <div>{t.remark}</div>
                      {(t.digits || t.session) && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {t.digits && (
                            <span className="font-mono text-brand-accent font-semibold">
                              — {t.digits}
                            </span>
                          )}
                          {t.session && (
                            <span
                              className={
                                t.session === 'open'
                                  ? 'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-900/40 text-blue-300 border border-blue-700'
                                  : t.session === 'close'
                                  ? 'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/40 text-amber-300 border border-amber-700'
                                  : 'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-slate-300 border border-slate-600'
                              }
                            >
                              {t.session}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {fmtDateTime(t.createdAt)}
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
              <span className="text-xs text-slate-500 ml-2">{total} rows</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2 py-1 text-xs bg-slate-700 rounded disabled:opacity-30"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs bg-slate-700 rounded disabled:opacity-30"
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
                className="px-3 py-1 text-xs bg-slate-700 rounded disabled:opacity-30"
              >
                Next
              </button>
              <button
                onClick={() => setPage(pages)}
                disabled={page >= pages}
                className="px-2 py-1 text-xs bg-slate-700 rounded disabled:opacity-30"
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