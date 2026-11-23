import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { todayLocal } from '../../utils/date';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Market { id: string; name: string; slug: string; }

// Exact 220-panna list from old getPatti()
const PANNA_LIST = [
  '100','119','155','227','335','344','399','588','669',
  '200','110','228','255','336','499','660','688','778',
  '300','166','229','337','355','445','599','779','788',
  '400','112','220','266','338','446','455','699','770',
  '500','113','122','177','339','366','447','799','889',
  '600','114','277','330','448','466','556','880','899',
  '700','115','133','188','223','377','449','557','566',
  '800','116','224','233','288','440','477','558','990',
  '900','117','144','199','225','388','559','577','667',
  '550','668','244','299','226','488','677',
  '118','334','128','137','146','236','245','290','380','470','489','560','678','579',
  '129','138','147','156','237','246','345','390','480','570','679',
  '120','139','148','157','238','247','256','346','490','580','670','689',
  '130','149','158','167','239','248','257','347','356','590','680','789',
  '140','159','168','230','249','258','267','348','357','456','690','780',
  '123','150','169','178','240','259','268','349','358','457','367','790',
  '124','160','179','250','269','278','340','359','368','458','467','890',
  '125','134','170','189','260','279','350','369','378','459','567','468',
  '126','135','180','234','270','289','360','379','450','469','478','568',
  '127','136','145','190','235','280','370','479','460','569','389','578','589',
  '000','111','222','333','444','555','666','777','888','999',
];

// --- Searchable dropdown (same as declare page) ---
function SearchSelect({
  value, onChange, options, placeholder = 'Select...',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = query ? options.filter((o) => o.includes(query)) : options;

  useEffect(() => { setHighlight(0); }, [query, open]);
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlight] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open]);

  const pick = (v: string) => { onChange(v); setOpen(false); setQuery(''); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) pick(filtered[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        className="input font-mono cursor-text"
        placeholder={open ? 'Type to search...' : value || placeholder}
        value={open ? query : value}
        onChange={(e) => { setQuery(e.target.value.replace(/\D/g, '').slice(0, 3)); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">▾</span>
      {open && (
        <ul ref={listRef} className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-slate-800 border border-brand-border rounded shadow-2xl">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-slate-500 text-sm">No matches</li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt)}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-2 font-mono text-sm cursor-pointer ${
                  i === highlight ? 'bg-brand-accent text-slate-900 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

interface DeclaredRow {
  id: string;
  name: string;
  openPanna: string | null;
  openDigit: string | null;
  closePanna: string | null;
  closeDigit: string | null;
  resultDate: string;
  openResultId: string | null;
  closeResultId: string | null;
}

export default function GameResultOld() {
  const [date, setDate] = useState(todayLocal());
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketId, setMarketId] = useState('');
  const [session, setSession] = useState('');
  const [panna, setPanna] = useState('');
  const [digit, setDigit] = useState('');
  const [rows, setRows] = useState<DeclaredRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [winnersModal, setWinnersModal] = useState<{
    name: string; session: 'open' | 'close'; rows: any[]; loading: boolean;
  } | null>(null);

  // Load markets — fetch all, robust against different response shapes
  useEffect(() => {
    api.get('/admin/games')
      .then((r) => {
        const payload = r.data?.data ?? r.data ?? [];
        const list: Market[] = Array.isArray(payload) ? payload : [];
        console.log('[GameResultOld] markets loaded:', list.length, list.map((m) => m.name));
        setMarkets(list);
      })
      .catch((e) => {
        console.error('[GameResultOld] failed to load games:', e);
      });
  }, []);

  // Auto-calc digit from panna
  useEffect(() => {
    if (panna.length === 3) {
      let sum = 0;
      for (const ch of panna) if (/\d/.test(ch)) sum += parseInt(ch);
      setDigit(String(sum % 10));
    } else {
      setDigit('');
    }
  }, [panna]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/game-result/today', { params: { date } });
      const payload = data?.data?.rows ?? data?.rows ?? [];
      const flattened: DeclaredRow[] = (payload as any[])
        .filter((r) => r.openResult || r.closeResult)
        .map((r) => ({
          id: r.id,
          name: r.name,
          openPanna: r.openResult?.panna ?? null,
          openDigit: r.openResult?.digit ?? null,
          closePanna: r.closeResult?.panna ?? null,
          closeDigit: r.closeResult?.digit ?? null,
          resultDate: r.openResult?.declaredAt || r.closeResult?.declaredAt || date,
          openResultId: r.openResult?.id ?? null,
          closeResultId: r.closeResult?.id ?? null,
        }));
      setRows(flattened);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date]);

  const submitResult = async () => {
    if (!marketId) return alert('Please select a Game');
    if (!session) return alert('Please select a Session');
    if (!panna || panna.length !== 3) return alert('Please enter a valid 3-digit Panna');
    if (!digit) return alert('Digit not generated');

    try {
      setLoading(true);
      // 🚀 Send the POST request to the backend
      await api.post('/admin/game-result/declare', {
        marketId,
        date,
        session,
        panna,
        digit
      });
      
      alert('✅ Result saved successfully!');
      setPanna('');
      setDigit('');
      load(); // Refresh table
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save result');
      setLoading(false);
    }
  };

  const viewWinners = async (marketIdArg: string, name: string, sess: 'open' | 'close') => {
    setWinnersModal({ name, session: sess, rows: [], loading: true });
    try {
      const { data } = await api.get('/admin/game-result/winners', {
        params: { marketId: marketIdArg, date, session: sess, status: 'won' },
      });
      setWinnersModal({ name, session: sess, rows: data.data || [], loading: false });
    } catch {
      setWinnersModal({ name, session: sess, rows: [], loading: false });
    }
  };

  const deleteResult = async (marketIdArg: string, sess: 'open' | 'close') => {
    if (!confirm(`Delete ${sess.toUpperCase()} result? Winners will be refunded and bids reset to pending.`)) return;
    try {
      await api.post('/admin/result/reverse', { marketId: marketIdArg, session: sess, date });
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const filteredRows = rows.filter((r) => {
    if (marketId && r.id !== marketId) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  // Exports
  const exportCSV = () => {
    const lines: string[] = [];
    lines.push(`Result History — ${date}`);
    lines.push('');
    lines.push('#,Game Name,Result Date,Open Pana,Close Pana');
    filteredRows.forEach((r, i) => {
      lines.push([
        i + 1,
        `"${r.name}"`,
        new Date(r.resultDate).toLocaleDateString('en-GB'),
        r.openPanna && r.openDigit ? `"${r.openPanna}-${r.openDigit}"` : '-',
        r.closePanna && r.closeDigit ? `"${r.closePanna}-${r.closeDigit}"` : '-',
      ].join(','));
    });
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `result_history_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
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
    doc.text('Result History', 14, 17);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Date: ${date}`, 14, 28);
    doc.text(`Total: ${filteredRows.length}`, 14, 33);
    autoTable(doc, {
      startY: 38,
      head: [['#', 'Game Name', 'Result Date', 'Open Pana', 'Close Pana']],
      body: filteredRows.map((r, i) => [
        i + 1, r.name,
        new Date(r.resultDate).toLocaleDateString('en-GB'),
        r.openPanna && r.openDigit ? `${r.openPanna}-${r.openDigit}` : '-',
        r.closePanna && r.closeDigit ? `${r.closePanna}-${r.closeDigit}` : '-',
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [120, 6, 6], textColor: [212, 175, 55], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 245, 235] },
    });
    doc.save(`result_history_${date}.pdf`);
  };

  const copyToClipboard = async () => {
    let txt = `Result History — ${date}\n\n`;
    filteredRows.forEach((r, i) => {
      const open = r.openPanna && r.openDigit ? `${r.openPanna}-${r.openDigit}` : '-';
      const close = r.closePanna && r.closeDigit ? `${r.closePanna}-${r.closeDigit}` : '-';
      txt += `${i + 1}. ${r.name} | Open: ${open} | Close: ${close}\n`;
    });
    try { await navigator.clipboard.writeText(txt); alert('Copied'); }
    catch { alert('Copy failed'); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-bold text-slate-100">Game Result (Old)</h1>

      {/* FILTERS */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Game ({markets.length} available)</label>
            <select className="input" value={marketId} onChange={(e) => setMarketId(e.target.value)}>
              <option value="">All Games</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Session</label>
            <select className="input" value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="">Select Session</option>
              <option value="open">Open</option>
              <option value="close">Close</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">Pana</label>
            <SearchSelect
              value={panna}
              onChange={setPanna}
              options={PANNA_LIST}
              placeholder="Search Pana (100, 119, ...)"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Digit (auto)</label>
            <input type="text" className="input bg-slate-800/50" readOnly value={digit} placeholder="—" />
          </div>
        </div>
        <button onClick={submitResult} className="btn-primary px-6">SAVE</button>
      </div>

      {/* TABLE */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-brand-border bg-slate-800/50">
          <button onClick={copyToClipboard} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-medium">Copy</button>
          <button onClick={exportCSV} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-medium">CSV</button>
          <button onClick={exportCSV} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-medium">Excel</button>
          <button onClick={exportPDF} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-medium">PDF</button>
          <button onClick={() => window.print()} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-medium">Print</button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-slate-400">Search:</label>
            <input type="text" className="text-xs bg-slate-800 border border-brand-border text-slate-200 rounded px-2 py-1 w-40"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No results declared for {date}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Result Date</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Open Pana</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Close Pana</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase">View Winning</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={r.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-3 text-slate-100 font-medium uppercase">{r.name}</td>
                    <td className="px-3 py-3 text-slate-300 text-xs">
                      {new Date(r.resultDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-200">
                      {r.openPanna && r.openDigit ? `${r.openPanna}-${r.openDigit}` : '-'}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-200">
                      {r.closePanna && r.closeDigit ? `${r.closePanna}-${r.closeDigit}` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => viewWinners(r.id, r.name, r.closeResultId ? 'close' : 'open')}
                        className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-medium">
                        View Winning
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => deleteResult(r.id, r.closeResultId ? 'close' : 'open')}
                        className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-medium">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border text-xs text-slate-500">
          <span>Showing {filteredRows.length} entries</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 bg-slate-700 text-slate-400 rounded disabled:opacity-40" disabled>Previous</button>
            <button className="px-3 py-1 bg-brand-accent text-slate-900 font-bold rounded">1</button>
            <button className="px-3 py-1 bg-slate-700 text-slate-400 rounded disabled:opacity-40" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* WINNERS MODAL */}
      {winnersModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border">
              <h3 className="text-lg font-bold text-slate-100">
                Winners — {winnersModal.name} ({winnersModal.session})
              </h3>
              <button onClick={() => setWinnersModal(null)} className="text-slate-400 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-auto">
              {winnersModal.loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                </div>
              ) : winnersModal.rows.length === 0 ? (
                <p className="text-center text-slate-500 py-12">No winners for this session</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/60 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">#</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Name</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Mobile</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Game</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Digits</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Bet</th>
                      <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Win</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winnersModal.rows.map((w: any, i: number) => (
                      <tr key={w.id} className="border-t border-brand-border">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-200">{w.userName}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">{w.userMobile}</td>
                        <td className="px-3 py-2 text-xs text-slate-400">{w.gameType}</td>
                        <td className="px-3 py-2 font-mono text-slate-200">{w.digits}</td>
                        <td className="px-3 py-2 text-right text-slate-200">{money(w.amount)}</td>
                        <td className="px-3 py-2 text-right text-emerald-400">{money(w.payout)}</td>
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