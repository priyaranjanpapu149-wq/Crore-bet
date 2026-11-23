import { useEffect, useState } from 'react';
import api from '../../api/axios';
import SearchSelect from '../../components/SearchSelect';
import { fmtDateTime } from '../../utils/date';

interface User {
  id: string;
  mobile: string;
  name: string;
  wallet: string;
}

interface RecentTxn {
  id: string;
  amount: string;
  type: number;
  remark: string;
  createdAt: string;
  user: { name: string; mobile: string } | null;
}

export default function AddPoints() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [userId, setUserId] = useState('');
  const [points, setPoints] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [recent, setRecent] = useState<RecentTxn[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Load users
  useEffect(() => {
    api
      .get('/admin/users', { params: { limit: 200 } })
      .then((r) => setUsers(r.data.data.rows || []))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, []);

  // Load recent admin credits
  const loadRecent = () => {
    setRecentLoading(true);
    api
      .get('/admin/transactions', { params: { limit: 50 } })
      .then((r) => {
        const rows: RecentTxn[] = (r.data.data.rows || []).filter(
          (t: any) => /Points Added By Admin|Admin credit/i.test(t.remark || '')
        );
        setRecent(rows.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setRecentLoading(false));
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const selectedUser = users.find((u) => u.id === userId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userId) return setError('Select a user');
    const amt = Number(points);
    if (!amt || amt <= 0) return setError('Enter a valid points amount');

    setSaving(true);
    try {
      await api.post('/admin/wallet/add', {
        userId,
        amount: amt,
        type: 1, // always credit
        remark: 'Points Added By Admin',
        skipBonus: true, // 🚀 THIS IS THE KEY CHANGE
      });

      setSuccess(
        `Credited ₹${amt.toLocaleString()} to ${selectedUser?.name || ''}`
      );
      setPoints('');

      // Refresh user list (to update wallet) + recent txns
      const r = await api.get('/admin/users', { params: { limit: 200 } });
      setUsers(r.data.data.rows || []);
      loadRecent();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to add points');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Add Points (User Wallet)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manually add points to a user wallet (no deposit bonus applied)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== FORM ===== */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Add Points</h2>

            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-red-300 text-sm mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded p-3 text-emerald-300 text-sm mb-4">
                {success}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {/* User */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Users
                </label>
                <SearchSelect
                  options={users.map((u) => ({
                    value: u.id,
                    label: `${u.name || 'Unnamed'} (${u.mobile})`,
                  }))}
                  value={userId}
                  onChange={setUserId}
                  placeholder="Select User"
                  loading={usersLoading}
                />
              </div>

              {/* Selected user preview */}
              {selectedUser && (
                <div className="bg-slate-800/50 border border-brand-border rounded p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs">Current Wallet</p>
                      <p className="text-emerald-400 font-bold text-lg">
                        ₹{Number(selectedUser.wallet).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Mobile</p>
                      <p className="font-mono text-slate-200">
                        {selectedUser.mobile}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Points */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Points
                </label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  placeholder="Enter Points"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-40"
              >
                {saving ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>

        {/* ===== RECENT ENTRIES ===== */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Recent Points Added</h2>
            {recentLoading ? (
              <p className="text-slate-500 text-sm">Loading...</p>
            ) : recent.length === 0 ? (
              <p className="text-slate-500 text-sm">No recent entries</p>
            ) : (
              <div className="space-y-2">
                {recent.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-800/50 border border-brand-border rounded p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate">
                          {t.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {t.user?.mobile || '—'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">
                        +₹{Number(t.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-500">
                        {fmtDateTime(t.createdAt)}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {t.remark}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}