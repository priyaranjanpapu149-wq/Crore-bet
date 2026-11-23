import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';

interface UserDetail {
  id: string;
  mobile: string;
  name: string;
  email: string | null;
  wallet: string;
  active: boolean;
  verified: boolean;
  mPin: string | null;
  referCode: string | null;
  referredBy: string | null;
  createdAt: string;
  lastSeen: string | null;
  lastIp?: string | null;
  lastDeviceId?: string | null;
  lastLat?: number | null;
  lastLng?: number | null;
  lastLocation?: string | null;
  bankDetails: any;
}

interface Summary {
  totalDeposit: number;
  totalWithdraw: number;
  totalBidAmount: number;
  totalBidCount: number;
  totalWinAmount: number;
}

type Tab = 'transactions' | 'bids' | 'withdrawals';

export default function UserView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState<Tab>('transactions');
  const [tabData, setTabData] = useState<any[]>([]);
  const [tabTotal, setTabTotal] = useState(0);
  const [tabPages, setTabPages] = useState(1);
  const [tabPage, setTabPage] = useState(1);
  const [tabLimit, setTabLimit] = useState(10);
  const [txnType, setTxnType] = useState<'' | 'credit' | 'debit'>('');
  const [tabLoading, setTabLoading] = useState(false);

  const [showAddPoints, setShowAddPoints] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsType, setPointsType] = useState<0 | 1>(1);
  const [pointsRemark, setPointsRemark] = useState('');
  const [saving, setSaving] = useState(false);

  const [showMpin, setShowMpin] = useState(false);
  const [newMpin, setNewMpin] = useState('');

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');

  const loadUser = async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        api.get(`/admin/users/${id}`),
        api.get(`/admin/users/${id}/summary`),
      ]);
      setUser(u.data.data);
      setSummary(s.data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadTab = async () => {
    setTabLoading(true);
    try {
      const url = `/admin/users/${id}/${tab}`;
      const params: any = { page: tabPage, limit: tabLimit };
      if (tab === 'transactions' && txnType) params.type = txnType;
      const { data } = await api.get(url, { params });
      setTabData(data.data.rows);
      setTabTotal(data.data.total);
      setTabPages(data.data.pages);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  useEffect(() => {
    loadTab();
  }, [tab, tabPage, tabLimit, txnType]);

  const toggleActive = async () => {
    if (!user) return;
    try {
      await api.post(`/admin/users/${user.id}/active`, { active: !user.active });
      loadUser();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const toggleVerified = async () => {
    if (!user) return;
    try {
      await api.post(`/admin/users/${user.id}/verify`, { verified: !user.verified });
      loadUser();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const addPoints = async () => {
    const amt = Number(pointsAmount);
    if (!amt || amt <= 0) return alert('Invalid amount');
    setSaving(true);
    try {
      await api.post('/admin/wallet/add', {
        userId: user!.id,
        amount: amt,
        type: pointsType,
        remark:
          pointsRemark ||
          (pointsType === 1 ? 'Points added by admin' : 'Points withdrawn by admin'),
      });
      setShowAddPoints(false);
      setPointsAmount('');
      setPointsRemark('');
      loadUser();
      loadTab();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const changeMpin = async () => {
    if (!/^\d{4}$/.test(newMpin)) return alert('M-Pin must be 4 digits');
    try {
      await api.post(`/admin/users/${user!.id}/mpin`, { mPin: newMpin });
      setShowMpin(false);
      setNewMpin('');
      loadUser();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) return alert('Password min 6 chars');
    if (!confirm('Reset user password? They will be logged out.')) return;
    try {
      await api.post(`/admin/users/${user!.id}/password`, { newPassword });
      setShowResetPassword(false);
      setNewPassword('');
      alert('Password reset successfully');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const approveWithdrawal = async (wid: string) => {
    if (!confirm('Approve this withdrawal?')) return;
    try {
      await api.post(`/admin/withdrawals/${wid}/approve`);
      loadTab();
      loadUser();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const rejectWithdrawal = async () => {
    if (!rejectId) return;
    try {
      await api.post(`/admin/withdrawals/${rejectId}/reject`, {
        remark: rejectRemark,
      });
      setRejectId(null);
      setRejectRemark('');
      loadTab();
      loadUser();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-300">
        {error || 'User not found'}
      </div>
    );
  }

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const bank = Array.isArray(user.bankDetails) ? user.bankDetails[0] : user.bankDetails;
  const hasLocation = user.lastLat != null && user.lastLng != null;
  const mapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${user.lastLat},${user.lastLng}`
    : null;

  const pageNumbers = () => {
    const arr: (number | 'dots')[] = [];
    if (tabPages <= 7) {
      for (let i = 1; i <= tabPages; i++) arr.push(i);
      return arr;
    }
    arr.push(1);
    if (tabPage > 4) arr.push('dots');
    const start = Math.max(2, tabPage - 1);
    const end = Math.min(tabPages - 1, tabPage + 1);
    for (let i = start; i <= end; i++) arr.push(i);
    if (tabPage < tabPages - 3) arr.push('dots');
    arr.push(tabPages);
    return arr;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">User Profile</h1>
        <Link
          to={`/wallet/transactions?userId=${user.id}`}
          className="ml-auto text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded"
        >
          View All Transactions →
        </Link>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-4">
            <p className="text-xs uppercase text-blue-300 font-medium">Total Deposits</p>
            <p className="text-xl md:text-2xl font-bold text-blue-300 mt-1">{money(summary.totalDeposit)}</p>
          </div>
          <div className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-4">
            <p className="text-xs uppercase text-amber-300 font-medium">Total Withdraw</p>
            <p className="text-xl md:text-2xl font-bold text-amber-300 mt-1">{money(summary.totalWithdraw)}</p>
          </div>
          <div className="bg-purple-900/30 border border-purple-700/40 rounded-lg p-4">
            <p className="text-xs uppercase text-purple-300 font-medium">Total Bids</p>
            <p className="text-xl md:text-2xl font-bold text-purple-300 mt-1">{money(summary.totalBidAmount)}</p>
            <p className="text-xs text-purple-400 mt-1">{summary.totalBidCount} bids placed</p>
          </div>
          <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-lg p-4">
            <p className="text-xs uppercase text-emerald-300 font-medium">Total Wins</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-300 mt-1">{money(summary.totalWinAmount)}</p>
          </div>
        </div>
      )}

      {/* Profile + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-brand-card border border-brand-border rounded-lg p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-200 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Name</p>
              <p className="text-slate-200 font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Mobile</p>
              <p className="text-slate-200 font-mono">{user.mobile}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-slate-200">{user.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Wallet</p>
              <p className="text-emerald-400 font-bold">{money(Number(user.wallet))}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Refer Code</p>
              <p className="text-slate-200 font-mono text-xs">{user.referCode || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Referred By</p>
              <p className="text-slate-200 font-mono text-xs">{user.referredBy || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">M-Pin</p>
              <p className="text-slate-200 font-mono">{user.mPin ? '••••' : 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Joined</p>
              <p className="text-slate-200">{new Date(user.createdAt).toLocaleDateString('en-GB')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Password</p>
              <p className="text-slate-200 font-mono">•••••••• (hashed)</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last Seen</p>
              <p className="text-slate-200 text-xs">
                {user.lastSeen ? new Date(user.lastSeen).toLocaleString('en-GB') : '—'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Last IP</p>
              <p className="text-slate-200 font-mono text-xs">{user.lastIp || '—'}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Device MAC / ID</p>
              <p className="text-slate-200 font-mono text-xs truncate">
                {user.lastDeviceId || '—'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Last Location</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-slate-200 text-xs">
                  {user.lastLocation ||
                    (hasLocation ? `${user.lastLat}, ${user.lastLng}` : '—')}
                </p>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-accent hover:text-yellow-400 font-medium"
                    title="Open in Google Maps"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Map
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-brand-border">
            <a
              href={`https://api.whatsapp.com/send?phone=91${user.mobile}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded"
            >
              WhatsApp
            </a>
            <a
              href={`tel:+91${user.mobile}`}
              className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded"
            >
              Call
            </a>
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-lg p-5 space-y-2">
          <h2 className="text-sm font-bold text-slate-200 mb-2">Actions</h2>
          <button
            onClick={() => setShowAddPoints(true)}
            className="w-full text-left text-sm bg-emerald-700/80 hover:bg-emerald-700 text-white px-3 py-2.5 rounded font-medium"
          >
            Add / Deduct Points
          </button>
          <button
            onClick={toggleActive}
            className={`w-full text-left text-sm px-3 py-2.5 rounded font-medium ${
              user.active
                ? 'bg-red-900/60 hover:bg-red-900 text-red-200'
                : 'bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200'
            }`}
          >
            {user.active ? 'Ban User' : 'Unban User'}
          </button>
          <button
            onClick={toggleVerified}
            className={`w-full text-left text-sm px-3 py-2.5 rounded font-medium ${
              user.verified
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-amber-900/60 hover:bg-amber-900 text-amber-200'
            }`}
          >
            {user.verified ? 'Mark Unverified' : 'Verify User'}
          </button>
          <button
            onClick={() => setShowMpin(true)}
            className="w-full text-left text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2.5 rounded font-medium"
          >
            Change M-Pin
          </button>
          <button
            onClick={() => setShowResetPassword(true)}
            className="w-full text-left text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2.5 rounded font-medium"
          >
            Reset Password
          </button>
        </div>
      </div>

      {/* Payment Information */}
      {bank && (
        <div className="bg-brand-card border border-brand-border rounded-lg p-5">
          <h2 className="text-sm font-bold text-slate-200 mb-4">Payment Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Holder Name</p>
              <p className="text-slate-200">{bank.holderName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Account No</p>
              <p className="text-slate-200 font-mono">{bank.accountNo || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">IFSC</p>
              <p className="text-slate-200 font-mono">{bank.ifsc || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">UPI</p>
              <p className="text-slate-200">{bank.upi || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">PhonePe</p>
              <p className="text-slate-200">{bank.phonepe || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">GPay</p>
              <p className="text-slate-200">{bank.gpay || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">PayTM</p>
              <p className="text-slate-200">{bank.paytm || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="flex border-b border-brand-border overflow-x-auto">
          {[
            { key: 'transactions', label: 'Transactions' },
            { key: 'bids', label: 'Bid History' },
            { key: 'withdrawals', label: 'Withdrawals' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key as Tab);
                setTabPage(1);
              }}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'text-brand-accent border-brand-accent'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center px-4 gap-2">
            <select
              className="text-xs bg-slate-800 border border-brand-border text-slate-300 rounded px-2 py-1"
              value={tabLimit}
              onChange={(e) => {
                setTabLimit(Number(e.target.value));
                setTabPage(1);
              }}
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
            <Link
              to={tab === 'transactions' ? `/wallet/transactions?userId=${user.id}` : '#'}
              className={`text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded ${
                tab !== 'transactions' ? 'invisible' : ''
              }`}
            >
              View All
            </Link>
          </div>
        </div>

        {tab === 'transactions' && (
          <div className="px-4 py-3 border-b border-brand-border flex gap-2">
            {(['', 'credit', 'debit'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTxnType(t);
                  setTabPage(1);
                }}
                className={`text-xs px-3 py-1 rounded ${
                  txnType === t
                    ? 'bg-brand-accent text-slate-900 font-medium'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {t === '' ? 'All' : t === 'credit' ? 'Credit' : 'Debit'}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-500 self-center">{tabTotal} records</span>
          </div>
        )}

        <div className="overflow-x-auto">
          {tabLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : tabData.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No records</p>
          ) : tab === 'transactions' ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Date</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Remark</th>
                  <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Amount</th>
                  <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {tabData.map((t: any) => (
                  <tr key={t.id} className="border-t border-brand-border">
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {t.remark}
                      {t.digits && (
                        <span className="ml-1 text-slate-400">
                          - {t.digits} {t.session?.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        t.type === 1 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {t.type === 1 ? '+' : '−'}₹{Number(t.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">
                      ₹{Number(t.balanceAfter).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'bids' ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Date</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Market</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Type</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Session</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Digits</th>
                  <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Amount</th>
                  <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {tabData.map((b: any) => (
                  <tr key={b.id} className="border-t border-brand-border">
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(b.bidDate).toLocaleString('en-GB')}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{b.market?.name}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{b.gameType}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs uppercase">{b.session || '—'}</td>
                    <td className="px-3 py-2 font-mono text-slate-200">{b.digits}</td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      ₹{Number(b.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          b.status === 'won'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : b.status === 'lost'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Date</th>
                  <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Amount</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Status</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 uppercase">Remark</th>
                  <th className="text-right px-3 py-2 text-xs text-slate-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {tabData.map((w: any) => (
                  <tr key={w.id} className="border-t border-brand-border">
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(w.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-400 font-medium">
                      ₹{Number(w.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          w.status === 'approved'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : w.status === 'rejected'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-amber-900/50 text-amber-300'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{w.remark || '—'}</td>
                    <td className="px-3 py-2">
                      {w.status === 'pending' ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => approveWithdrawal(w.id)}
                            className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectId(w.id)}
                            className="text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 block text-right">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {tabPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border flex-wrap gap-2">
            <span className="text-xs text-slate-500">
              Page {tabPage} of {tabPages} · {tabTotal} records
            </span>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setTabPage(1)}
                disabled={tabPage <= 1}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                «
              </button>
              <button
                onClick={() => setTabPage((p) => Math.max(1, p - 1))}
                disabled={tabPage <= 1}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                Prev
              </button>
              {pageNumbers().map((p, idx) =>
                p === 'dots' ? (
                  <span key={`d${idx}`} className="px-2 py-1 text-xs text-slate-500">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setTabPage(p)}
                    className={`px-3 py-1 text-xs rounded ${
                      p === tabPage
                        ? 'bg-brand-accent text-slate-900 font-bold'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setTabPage((p) => Math.min(tabPages, p + 1))}
                disabled={tabPage >= tabPages}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                Next
              </button>
              <button
                onClick={() => setTabPage(tabPages)}
                disabled={tabPage >= tabPages}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Points Modal */}
      {showAddPoints && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Add / Deduct Points</h3>
              <button onClick={() => setShowAddPoints(false)} className="text-slate-400 text-2xl leading-none">
                ×
              </button>
            </div>
            <div className="text-sm text-slate-400">
              User: <span className="text-slate-200 font-mono">{user.mobile}</span>
              <br />
              Current: <span className="text-emerald-400 font-bold">{money(Number(user.wallet))}</span>
            </div>
            <div>
              <label className="text-xs text-slate-500">Action</label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setPointsType(1)}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    pointsType === 1 ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Credit (+)
                </button>
                <button
                  onClick={() => setPointsType(0)}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    pointsType === 0 ? 'bg-red-700 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Debit (−)
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Amount (₹)</label>
              <input
                type="number"
                className="input"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                placeholder="100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Remark (optional)</label>
              <input
                type="text"
                className="input"
                value={pointsRemark}
                onChange={(e) => setPointsRemark(e.target.value)}
                placeholder="Bonus / Refund / etc"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddPoints(false)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={addPoints}
                disabled={saving}
                className="px-4 py-2 bg-brand-accent text-slate-900 font-medium rounded text-sm"
              >
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* M-Pin Modal */}
      {showMpin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Change M-Pin</h3>
              <button onClick={() => setShowMpin(false)} className="text-slate-400 text-2xl leading-none">
                ×
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              className="input text-center text-2xl tracking-widest font-mono"
              value={newMpin}
              onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowMpin(false)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={changeMpin}
                className="px-4 py-2 bg-brand-accent text-slate-900 font-medium rounded text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Reset Password</h3>
              <button
                onClick={() => setShowResetPassword(false)}
                className="text-slate-400 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-slate-400">
              User will be logged out of all sessions and must use the new password.
            </p>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetPassword(false)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={resetPassword}
                className="px-4 py-2 bg-red-700 text-white font-medium rounded text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Withdrawal Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Reject Withdrawal</h3>
              <button onClick={() => setRejectId(null)} className="text-slate-400 text-2xl leading-none">
                ×
              </button>
            </div>
            <p className="text-xs text-slate-400">Amount will be refunded to user's wallet.</p>
            <input
              type="text"
              className="input"
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              placeholder="Reason (optional)"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectId(null)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={rejectWithdrawal}
                className="px-4 py-2 bg-red-700 text-white font-medium rounded text-sm"
              >
                Reject & Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}