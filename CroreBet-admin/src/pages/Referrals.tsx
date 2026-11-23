import { useEffect, useState } from 'react';
import api from '../api/axios';

interface Ref {
  id: string;
  referrerMobile: string;
  refereeMobile: string;
  refereeName: string | null;
  referralCode: string;
  depositAmount: string;
  cashbackAmount: string;
  status: 'pending' | 'eligible' | 'paid' | 'rejected';
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Cfg {
  enabled: boolean;
  type: 'signup' | 'first_deposit' | 'all_deposits' | 'multi';
  fixedAmount: number;
  percent: number;
  firstDepositMin: number;
  playRequired: boolean;
  playThresholdPct: number;
  maxCashback: number;
}

export default function Referrals() {
  const [rows, setRows] = useState<Ref[]>([]);
  const [totals, setTotals] = useState({ total: 0, totalPending: 0, totalEligible: 0, totalPaid: 0 });
  const [filter, setFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [payModal, setPayModal] = useState<Ref | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const [rejectModal, setRejectModal] = useState<Ref | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [savingCfg, setSavingCfg] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/referrals', {
        params: { status: filter || undefined, search: search || undefined },
      });
      setRows(data.data.rows);
      setTotals({
        total: data.data.total,
        totalPending: data.data.totalPending,
        totalEligible: data.data.totalEligible,
        totalPaid: data.data.totalPaid,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCfg = async () => {
    const { data } = await api.get('/admin/referrals/settings');
    setCfg(data.data);
  };

  useEffect(() => {
    load();
  }, [filter, search]);

  useEffect(() => {
    loadCfg();
  }, []);

  const doSearch = () => setSearch(searchInput);

  const saveCfg = async () => {
    if (!cfg) return;
    setSavingCfg(true);
    try {
      await api.post('/admin/referrals/settings', cfg);
      setShowSettings(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setSavingCfg(false);
    }
  };

  const doPay = async () => {
    if (!payModal) return;
    setPaying(true);
    try {
      await api.post(`/admin/referrals/${payModal.id}/pay`, {
        cashbackAmount: payAmount ? Number(payAmount) : undefined,
      });
      setPayModal(null);
      setPayAmount('');
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Pay failed');
    } finally {
      setPaying(false);
    }
  };

  const doReject = async () => {
    if (!rejectModal) return;
    setRejecting(true);
    try {
      await api.post(`/admin/referrals/${rejectModal.id}/reject`);
      setRejectModal(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Reject failed');
    } finally {
      setRejecting(false);
    }
  };

  const doRecheck = async (id: string) => {
    try {
      await api.post(`/admin/referrals/${id}/recheck`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Recheck failed');
    }
  };

  const money = (n: number | string) =>
    '₹' + Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Referrals</h1>
          <p className="text-xs text-slate-500 mt-1">
            Auto-tracked from deposits + play. Admin approves payouts.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-brand-card border border-brand-border rounded-lg p-4">
          <p className="text-xs uppercase text-slate-500 font-medium">Total Referrals</p>
          <p className="text-xl md:text-2xl font-bold text-slate-100 mt-1">{totals.total}</p>
        </div>
        <div className="bg-slate-800/50 border border-brand-border rounded-lg p-4">
          <p className="text-xs uppercase text-slate-400 font-medium">Pending (not played)</p>
          <p className="text-xl md:text-2xl font-bold text-slate-300 mt-1">{money(totals.totalPending)}</p>
        </div>
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4">
          <p className="text-xs uppercase text-amber-300 font-medium">Eligible (ready to pay)</p>
          <p className="text-xl md:text-2xl font-bold text-amber-300 mt-1">{money(totals.totalEligible)}</p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-4">
          <p className="text-xs uppercase text-emerald-300 font-medium">Paid</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-300 mt-1">{money(totals.totalPaid)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder="Search mobile number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <select
            className="input md:w-44"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All status</option>
            <option value="pending">Pending (not played)</option>
            <option value="eligible">Eligible (ready to pay)</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={doSearch} className="btn-primary">
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Referrer</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Referee</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Deposit</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Cashback</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Notes</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-500 py-12">
                    No referrals yet
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3">
                      <div className="font-mono text-slate-200">{r.referrerMobile}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-slate-200">{r.refereeName || '—'}</div>
                      <div className="font-mono text-xs text-slate-500">{r.refereeMobile}</div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-300 font-medium">
                      {money(r.depositAmount)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-emerald-400 font-semibold">
                        {money(r.cashbackAmount)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        r.status === 'paid'
                          ? 'bg-emerald-900/50 text-emerald-300'
                          : r.status === 'eligible'
                          ? 'bg-amber-900/50 text-amber-300'
                          : r.status === 'pending'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 max-w-[240px]">
                      <div className="truncate" title={r.notes || ''}>
                        {r.notes || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-end">
                        {r.status === 'eligible' && (
                          <button
                            onClick={() => {
                              setPayModal(r);
                              setPayAmount(r.cashbackAmount);
                            }}
                            className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded font-medium"
                          >
                            Pay
                          </button>
                        )}
                        {r.status === 'pending' && (
                          <button
                            onClick={() => doRecheck(r.id)}
                            className="text-xs bg-blue-800 hover:bg-blue-700 text-white px-3 py-1 rounded font-medium"
                            title="Recalculate eligibility (deposit + play)"
                          >
                            Recheck
                          </button>
                        )}
                        {(r.status === 'pending' || r.status === 'eligible') && (
                          <button
                            onClick={() => setRejectModal(r)}
                            className="text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1 rounded"
                          >
                            Reject
                          </button>
                        )}
                        {r.status === 'paid' && r.paidAt && (
                          <span className="text-xs text-slate-500">
                            {new Date(r.paidAt).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Pay Cashback</h3>
              <button
                onClick={() => setPayModal(null)}
                className="text-slate-400 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="text-sm text-slate-400 space-y-1">
              <div>
                To:{' '}
                <span className="text-slate-100 font-mono">{payModal.referrerMobile}</span>
              </div>
              <div>
                Referee deposit:{' '}
                <span className="text-slate-100">{money(payModal.depositAmount)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Cashback Amount (₹)</label>
              <input
                type="number"
                className="input"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">
                Auto-calculated. You can adjust before paying.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPayModal(null)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doPay}
                disabled={paying}
                className="px-4 py-2 bg-brand-accent text-slate-900 font-semibold rounded text-sm"
              >
                {paying ? 'Paying...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Reject Referral?</h3>
            <p className="text-sm text-slate-400">
              Referrer:{' '}
              <span className="text-slate-200 font-mono">
                {rejectModal.referrerMobile}
              </span>
              <br />
              Referee: <span className="text-slate-200">{rejectModal.refereeName}</span>
            </p>
            <p className="text-xs text-red-300">
              This cannot be undone. The referral will be marked as rejected.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doReject}
                disabled={rejecting}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-medium rounded text-sm"
              >
                {rejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && cfg && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-lg space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Referral Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-slate-200">Enable referral system</span>
            </label>

            <div>
              <label className="text-xs text-slate-500">Reward Type</label>
              <select
                className="input mt-1"
                value={cfg.type}
                onChange={(e) => setCfg({ ...cfg, type: e.target.value as any })}
              >
                <option value="signup">Signup only (fixed ₹)</option>
                <option value="first_deposit">First deposit (% of deposit)</option>
                <option value="all_deposits">All deposits (% recurring)</option>
                <option value="multi">Multi (fixed + % deposits)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Fixed Amount (₹)</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={cfg.fixedAmount}
                  onChange={(e) =>
                    setCfg({ ...cfg, fixedAmount: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Cashback %</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={cfg.percent}
                  onChange={(e) =>
                    setCfg({ ...cfg, percent: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">First Deposit Min (₹)</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={cfg.firstDepositMin}
                  onChange={(e) =>
                    setCfg({ ...cfg, firstDepositMin: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Max Cashback (₹)</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={cfg.maxCashback}
                  onChange={(e) =>
                    setCfg({ ...cfg, maxCashback: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.playRequired}
                onChange={(e) =>
                  setCfg({ ...cfg, playRequired: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-slate-200">
                Require referee to play before cashback eligible
              </span>
            </label>

            {cfg.playRequired && (
              <div>
                <label className="text-xs text-slate-500">
                  Play Threshold (% of deposit must be wagered)
                </label>
                <input
                  type="number"
                  className="input mt-1"
                  value={cfg.playThresholdPct}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      playThresholdPct: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-slate-500 mt-1">
                  Example: deposit ₹500, threshold 100% → referee must bet ₹500
                  to be eligible.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-brand-border">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveCfg}
                disabled={savingCfg}
                className="px-4 py-2 bg-brand-accent text-slate-900 font-semibold rounded text-sm"
              >
                {savingCfg ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}