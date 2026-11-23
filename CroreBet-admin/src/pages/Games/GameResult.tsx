import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { todayLocal } from '../../utils/date';

interface Row {
  id: string;
  name: string;
  openTime: string | null;
  closeTime: string | null;
  openResult: { id: string; panna: string | null; digit: string | null; declaredAt: string } | null;
  closeResult: { id: string; panna: string | null; digit: string | null; declaredAt: string } | null;
}

function fmt12(t: string | null): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}${ampm}`;
}

// Treat empty / 0 / 000 / null / undefined as "no real value"
function hasRealValue(v: string | null | undefined): boolean {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== '' && s !== '0' && s !== '000' && s !== 'null' && s !== 'undefined';
}

function ResultBox({
  panna,
  digit,
  onReverse,
  onView,
}: {
  panna: string | null;
  digit: string | null;
  onReverse: () => void;
  onView: () => void;
}) {
  const hasPanna = hasRealValue(panna);
  const hasDigit = hasRealValue(digit);

  if (!hasPanna && !hasDigit) {
    return <div className="text-center text-xs text-slate-600 italic">Pending</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="bg-blue-800 text-white px-3 py-2 rounded text-xs font-mono flex-1 text-center">
        {hasPanna ? panna : '—'}-{hasDigit ? digit : '—'}
      </div>
      <button
        onClick={onReverse}
        className="text-xs bg-amber-700 hover:bg-amber-600 text-white px-2 py-1.5 rounded"
        title="Reverse result"
      >
        Reverse
      </button>
      <button
        onClick={onView}
        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1.5 rounded"
        title="View winners"
      >
        👁
      </button>
    </div>
  );
}

export default function GameResult() {
  const today = todayLocal();
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [winnersModal, setWinnersModal] = useState<{
    row: Row;
    session: 'open' | 'close';
    rows: any[];
    loading: boolean;
  } | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/game-result/today', { params: { date } });
      setRows(data.data.rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const doReverse = async (row: Row, session: 'open' | 'close') => {
    if (!confirm(`Reverse ${session.toUpperCase()} result for ${row.name}? Winners will be refunded.`))
      return;
    try {
      await api.post('/admin/result/reverse', { marketId: row.id, session, date });
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Reverse failed');
    }
  };

  const viewWinners = async (row: Row, session: 'open' | 'close') => {
    setWinnersModal({ row, session, rows: [], loading: true });
    try {
      const { data } = await api.get('/admin/game-result/winners', {
        params: { marketId: row.id, date, session, status: 'won' },
      });
      setWinnersModal({ row, session, rows: data.data, loading: false });
    } catch {
      setWinnersModal({ row, session, rows: [], loading: false });
    }
  };

  const goDeclare = (row: Row, session: 'open' | 'close') => {
    const time = session === 'open' ? row.openTime : row.closeTime;
    navigate(
      `/games/result/declare?market=${encodeURIComponent(row.name)}&session=${session}&time=${time || ''}`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Declare Result</h1>
          <p className="text-xs text-slate-500 mt-1">Add open / close results for markets</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Date</label>
          <input
            type="date"
            className="input w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No markets</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Open Time</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Close Time</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-56">Open Result</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-56">Close Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-3 text-slate-100 font-semibold uppercase">{r.name}</td>
                    <td className="px-3 py-3 text-slate-300 font-mono text-xs">{fmt12(r.openTime)}</td>
                    <td className="px-3 py-3 text-slate-300 font-mono text-xs">{fmt12(r.closeTime)}</td>

                    {/* Open */}
                    <td className="px-3 py-3">
                      {r.openResult && (hasRealValue(r.openResult.panna) || hasRealValue(r.openResult.digit)) ? (
                        <ResultBox
                          panna={r.openResult.panna}
                          digit={r.openResult.digit}
                          onReverse={() => doReverse(r, 'open')}
                          onView={() => viewWinners(r, 'open')}
                        />
                      ) : (
                        <button
                          onClick={() => goDeclare(r, 'open')}
                          className="w-full text-xs bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-2 rounded font-medium"
                        >
                          Add Open Result
                        </button>
                      )}
                    </td>

                    {/* Close */}
                    <td className="px-3 py-3">
                      {r.closeResult && (hasRealValue(r.closeResult.panna) || hasRealValue(r.closeResult.digit)) ? (
                        <ResultBox
                          panna={r.closeResult.panna}
                          digit={r.closeResult.digit}
                          onReverse={() => doReverse(r, 'close')}
                          onView={() => viewWinners(r, 'close')}
                        />
                      ) : r.openResult && (hasRealValue(r.openResult.panna) || hasRealValue(r.openResult.digit)) ? (
                        <button
                          onClick={() => goDeclare(r, 'close')}
                          className="w-full text-xs bg-orange-700 hover:bg-orange-600 text-white px-3 py-2 rounded font-medium"
                        >
                          Add Close Result
                        </button>
                      ) : (
                        <div className="text-center text-xs text-slate-600">—</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Winners Modal */}
      {winnersModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border">
              <h3 className="text-lg font-bold text-slate-100">
                Winners — {winnersModal.row.name} ({winnersModal.session})
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
                <p className="text-center text-slate-500 py-12">No winners yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/60 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">#</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Name</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Mobile</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Game</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Bid</th>
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
                        <td className="px-3 py-2 text-right text-slate-200">₹{w.amount}</td>
                        <td className="px-3 py-2 text-right text-emerald-400">₹{w.payout}</td>
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