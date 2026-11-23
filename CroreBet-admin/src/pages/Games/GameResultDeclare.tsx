import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { todayLocal } from '../../utils/date';

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

function calcDigit(panna: string): string {
  let sum = 0;
  for (const ch of panna) if (/\d/.test(ch)) sum += parseInt(ch);
  return String(sum % 10);
}

// ---------------- Searchable Select ----------------
function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = query
    ? options.filter((o) => o.includes(query))
    : options;

  // Reset highlight when filtered changes
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Scroll highlighted into view
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlight] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        className="input font-mono tracking-widest text-lg cursor-text"
        placeholder={open ? 'Type to search...' : value || placeholder}
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value.replace(/\D/g, '').slice(0, 3));
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        readOnly={false}
      />

      {/* Caret icon */}
      <span
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        aria-hidden
      >
        ▾
      </span>

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
// ---------------- End Searchable Select ----------------

export default function GameResultDeclare() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const market = params.get('market') || '';
  const session = (params.get('session') || 'open') as 'open' | 'close';
  const marketTime = params.get('time') || '';

  const [panna, setPanna] = useState('');
  const [digit, setDigit] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [winnersModal, setWinnersModal] = useState<{ rows: any[]; loading: boolean } | null>(null);

  useEffect(() => {
    if (panna.length === 3) setDigit(calcDigit(panna));
    else setDigit('');
    setSaved(false);
  }, [panna]);

  const doSave = () => {
    if (!panna || panna.length !== 3) return alert('Select a 3-digit Panna');
    setSaved(true);
  };

  const doDeclare = async () => {
    if (!confirm(`Declare ${session.toUpperCase()} result for ${market}? Winners will be paid automatically.`))
      return;
    setSaving(true);
    try {
      const gamesResp = await api.get('/admin/games');
      const found = (gamesResp.data.data as any[]).find(
        (m) => m.name.toUpperCase() === market.toUpperCase()
      );
      if (!found) {
        alert('Market not found');
        return;
      }

      const body: any = { marketId: found.id, session, pannaResult: panna };
      if (session === 'open') body.openResult = digit;
      else body.closeResult = digit;

      await api.post('/admin/result/declare', body);
      alert('Result declared successfully');
      navigate('/games/result');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const showWinners = async () => {
    if (!panna || panna.length !== 3) {
      alert('Select a 3-digit Panna first');
      return;
    }
    setWinnersModal({ rows: [], loading: true });
    try {
      const gamesResp = await api.get('/admin/games');
      const found = (gamesResp.data.data as any[]).find(
        (m) => m.name.toUpperCase() === market.toUpperCase()
      );
      if (!found) {
        setWinnersModal(null);
        return;
      }
      const today = todayLocal();

      // 🚀 Pass the panna/digit so the backend filters to real winners only
      const params: any = {
        marketId: found.id,
        date: today,
        session,
      };

      if (session === 'open') {
        params.panna = panna;       // open panna declared
        params.digit = digit;       // open digit declared
      } else {
        params.cpanna = panna;      // close panna declared
        params.cdigit = digit;      // close digit declared
      }

      const { data } = await api.get('/admin/winner-prediction', { params });

      // Backend returns { rows: [...] } — filter out rows with 0 winning just in case
      const rows = (data.data?.rows || []).filter((r: any) => r.winning > 0);
      setWinnersModal({ rows, loading: false });
    } catch (e: any) {
      console.error(e);
      setWinnersModal({ rows: [], loading: false });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
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
            Update {session} Result
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {market} · {marketTime}
          </p>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Game</label>
            <input type="text" className="input mt-1" value={market} readOnly />
          </div>
          <div>
            <label className="text-xs text-slate-500">{session} Time</label>
            <input type="text" className="input mt-1" value={marketTime} readOnly />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Panna</label>
            <div className="mt-1">
              <SearchSelect
                value={panna}
                onChange={setPanna}
                options={PANNA_LIST}
                placeholder="Select Panna"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Digit (auto-calculated)</label>
            <input
              type="text"
              className="input mt-1 font-mono tracking-widest text-lg"
              value={digit}
              readOnly
            />
          </div>
        </div>

        {!saved && (
          <button onClick={doSave} className="btn-primary w-full">
            SAVE
          </button>
        )}

        {saved && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-brand-border">
            <button
              onClick={showWinners}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-3 rounded"
            >
              SHOW WINNERS
            </button>
            <button
              onClick={doDeclare}
              disabled={saving}
              className="bg-blue-700 hover:bg-blue-600 text-white font-semibold py-3 rounded disabled:opacity-50"
            >
              {saving ? 'Declaring...' : 'DECLARE RESULT'}
            </button>
          </div>
        )}

        <p className="text-xs text-slate-500 text-center pt-2">
          Declaring will pay all matching winners and mark other bids as lost.
        </p>
      </div>

      {/* Winners Modal */}
      {winnersModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border">
              <h3 className="text-lg font-bold text-slate-100">
                Winners Preview — {market} ({session})
              </h3>
              <button
                onClick={() => setWinnersModal(null)}
                className="text-slate-400 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-auto">
              {winnersModal.loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                </div>
              ) : winnersModal.rows.length === 0 ? (
                <p className="text-center text-slate-500 py-12">No matching winners</p>
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
                        {/* 🚀 FIXED — 'winning' is the field returned by backend, not 'payout' */}
                        <td className="px-3 py-2 text-right text-slate-200">
                          ₹{(w.amount ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-400 font-medium">
                          ₹{(w.winning ?? w.payout ?? 0).toLocaleString('en-IN')}
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