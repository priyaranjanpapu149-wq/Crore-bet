import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { todayLocal } from '../../utils/date';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Market { id: string; name: string; slug: string; }

// 220-panna list — same order as old PHP getPatti()
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

function calcDigit(panna: string): string {
  let sum = 0;
  for (const ch of panna) if (/\d/.test(ch)) sum += parseInt(ch);
  return String(sum % 10);
}

// --- SearchSelect — searchable dropdown for panna ---
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
        onChange={(e) => {
          setQuery(e.target.value.replace(/\D/g, '').slice(0, 3));
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">▾</span>
      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-slate-800 border border-brand-border rounded shadow-2xl"
        >
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
                  i === highlight
                    ? 'bg-brand-accent text-slate-900 font-semibold'
                    : 'text-slate-200 hover:bg-slate-700'
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

interface ResultRow {
  id: string;
  userName: string;
  userMobile: string;
  amount: number;
  winning: number;
  marketName: string;
  gameType: string;
  digits: string;
  session: string | null;
  status: string;
  betDate: string;
}

interface ApiResponse {
  market: { id: string; name: string };
  session: string;
  date: string;
  totalBid: number;
  totalWin: number;
  ratesUsed: Record<string, number>;
  rows: ResultRow[];
}

export default function WinnerPrediction() {
  const navigate = useNavigate();

  const [date, setDate] = useState(todayLocal());
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketId, setMarketId] = useState('');
  const [session, setSession] = useState<'open' | 'close' | ''>('');
  const [panna, setPanna] = useState('');
  const [cpanna, setCpanna] = useState('');
  const [digit, setDigit] = useState('');
  const [cdigit, setCdigit] = useState('');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState('');

  // Load markets list
  useEffect(() => {
    api.get('/admin/games')
      .then((r) => {
        const payload = r.data?.data ?? [];
        setMarkets(Array.isArray(payload) ? payload : []);
      })
      .catch(() => {});
  }, []);

  // Auto-calc digits from pannas
  useEffect(() => { setDigit(panna.length === 3 ? calcDigit(panna) : ''); }, [panna]);
  useEffect(() => { setCdigit(cpanna.length === 3 ? calcDigit(cpanna) : ''); }, [cpanna]);

  // Clear stale results when filters change
  useEffect(() => { setData(null); setError(''); }, [date, marketId, session, panna, cpanna]);

  const load = async () => {
    setError('');
    if (!date || !marketId || !session) {
      setError('Please select Date, Game, and Session');
      return;
    }
    if (session === 'open' && (!panna || panna.length !== 3)) {
      setError('Please select a 3-digit Open Pana');
      return;
    }
    if (session === 'close' && (!cpanna || cpanna.length !== 3)) {
      setError('Please select a 3-digit Close Pana');
      return;
    }

    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/winner-prediction', {
        params: { date, marketId, session, panna, digit, cpanna, cdigit },
      });
      setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const goDeclare = () => {
    if (!data) return;
    const marketName = data.market.name;
    const selectedPanna = session === 'open' ? panna : cpanna;
    const selectedDigit = session === 'open' ? digit : cdigit;
    navigate(
      `/games/result/declare?market=${encodeURIComponent(marketName)}&session=${session}&panna=${selectedPanna}&digit=${selectedDigit}`
    );
  };

  const exportCSV = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`Winner Prediction — ${data.market.name} (${data.session})`);
    lines.push(`Date,${data.date}`);
    lines.push('');
    lines.push('#,User Name,Mobile,Bid Points,Winning Points,Market,Game,Bid Number,Time');
    data.rows.forEach((r, i) => {
      lines.push([
        i + 1,
        `"${r.userName}"`,
        r.userMobile,
        r.amount,
        r.winning,
        `"${r.marketName}"`,
        r.gameType,
        `"${r.digits}"`,
        new Date(r.betDate).toLocaleString('en-GB'),
      ].join(','));
    });
    lines.push('');
    lines.push(`"Total Bid","${data.totalBid}"`);
    lines.push(`"Total Win","${data.totalWin}"`);
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `winner_prediction_${data.market.name}_${data.session}_${data.date}.csv`;
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
    doc.text('Winner Prediction', 14, 17);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(
      `Market: ${data.market.name} | Session: ${data.session} | Date: ${data.date} | Rows: ${data.rows.length}`,
      14,
      28
    );
    doc.text(
      `Total Bid: ₹${data.totalBid} | Total Win: ₹${data.totalWin}`,
      14,
      33
    );

    autoTable(doc, {
      startY: 38,
      head: [['#', 'User', 'Mobile', 'Bet', 'Win', 'Market', 'Game', 'Number', 'Time']],
      body: data.rows.map((r, i) => [
        i + 1,
        r.userName,
        r.userMobile,
        r.amount,
        r.winning,
        r.marketName,
        r.gameType,
        r.digits,
        new Date(r.betDate).toLocaleString('en-GB'),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [120, 6, 6], textColor: [212, 175, 55], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 245, 235] },
    });
    doc.save(`winner_prediction_${data.market.name}_${data.session}_${data.date}.pdf`);
  };

  const copyData = async () => {
    if (!data) return;
    let txt = `Winner Prediction — ${data.market.name} (${data.session})\nDate: ${data.date}\n\n`;
    data.rows.forEach((r, i) => {
      txt += `${i + 1}. ${r.userName} | ${r.userMobile} | Bid: ₹${r.amount} | Win: ₹${r.winning} | ${r.gameType} | ${r.digits}\n`;
    });
    txt += `\nTotal Bid: ₹${data.totalBid}\nTotal Win: ₹${data.totalWin}\n`;
    try {
      await navigator.clipboard.writeText(txt);
      alert('Copied');
    } catch {
      alert('Copy failed');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-bold text-slate-100">Winning Prediction</h1>

      {/* ================= FILTERS ================= */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4 space-y-4">

        {/* Row 1: Date | Game | Session */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <label className="text-xs text-slate-500 mb-1 block">
              Game ({markets.length} available)
            </label>
            <select
              className="input"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
            >
              <option value="">Select Game</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Session</label>
            <select
              className="input"
              value={session}
              onChange={(e) => setSession(e.target.value as 'open' | 'close' | '')}
            >
              <option value="">Select Session</option>
              <option value="open">Open</option>
              <option value="close">Close</option>
            </select>
          </div>
        </div>

        {/* Row 2: Open Pana + Digit | Close Pana + Digit — ALWAYS visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 block">Open Pana</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <SearchSelect
                  value={panna}
                  onChange={setPanna}
                  options={PANNA_LIST}
                  placeholder="Search Open Pana"
                />
              </div>
              <input
                type="text"
                className="input bg-slate-800/50 font-mono text-center text-lg"
                value={digit}
                readOnly
                placeholder="—"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 block">Close Pana</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <SearchSelect
                  value={cpanna}
                  onChange={setCpanna}
                  options={PANNA_LIST}
                  placeholder="Search Close Pana"
                />
              </div>
              <input
                type="text"
                className="input bg-slate-800/50 font-mono text-center text-lg"
                value={cdigit}
                readOnly
                placeholder="—"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Submit + exports */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="btn-primary px-6"
          >
            {loading ? 'Loading...' : 'Submit'}
          </button>
          {data && (
            <>
              <button
                onClick={copyData}
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
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* ================= TOTALS ================= */}
      {data && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-4">
              <p className="text-xs uppercase text-blue-300 font-medium">Total Bid Amount</p>
              <p className="text-2xl font-bold text-blue-300 mt-1">{money(data.totalBid)}</p>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-lg p-4">
              <p className="text-xs uppercase text-emerald-300 font-medium">Total Winning Amount</p>
              <p className="text-2xl font-bold text-emerald-300 mt-1">{money(data.totalWin)}</p>
            </div>
          </div>

          {/* Rates debug strip */}
          <div className="bg-slate-800/50 border border-brand-border rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Rates applied (Settings → per-market override)
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(data.ratesUsed).map(([gt, val]) => (
                <span key={gt} className="text-slate-300">
                  <span className="text-slate-500">{gt}:</span>{' '}
                  <span className="text-brand-accent font-mono">{val}</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ================= RESULTS TABLE ================= */}
      {data && !loading && (
        <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
            <h2 className="text-sm font-bold text-slate-200">
              Potential Winners — {data.rows.length}
            </h2>
            {data.rows.length > 0 && (
              <button
                onClick={goDeclare}
                className="bg-brand-accent hover:bg-yellow-500 text-slate-900 font-semibold px-4 py-2 rounded text-sm"
              >
                Declare Result →
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            {data.rows.length === 0 ? (
              <p className="text-center text-slate-500 py-12">
                No matching bids — nobody would win this result
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60">
                  <tr>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-12">#</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">User Name</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Mobile</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Bid Points</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Winning Points</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Market</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Bid Number</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={r.id} className="border-t border-brand-border hover:bg-slate-800/30">
                      <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-3 text-slate-100">{r.userName}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-400">{r.userMobile}</td>
                      <td className="px-3 py-3 text-right text-slate-200">{money(r.amount)}</td>
                      <td className="px-3 py-3 text-right text-emerald-400 font-medium">
                        {money(r.winning)}
                      </td>
                      <td className="px-3 py-3 text-slate-300">{r.marketName}</td>
                      <td className="px-3 py-3 text-xs text-slate-400">{r.gameType}</td>
                      <td className="px-3 py-3 font-mono text-slate-200">{r.digits}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(r.betDate).toLocaleString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}