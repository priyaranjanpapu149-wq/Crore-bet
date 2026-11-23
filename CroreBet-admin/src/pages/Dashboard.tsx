import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  todayUsers: number;
  bannedUsers: number;
  totalBids: number;
  todayBids: number;
  todayBidAmount: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  walletAmount: number;
  totalBidAmount: number;
  todayWinAmount: number;
  todayAmountPaid: number;
  todayDepositBonus: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayManualDeposits: number;
  todayManualWithdrawals: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((r) => setStats(r.data.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-red-400">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const cards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      sub: `${stats.activeUsers} active · ${stats.todayUsers} today`,
      more: '/users',
      accent: 'text-blue-400',
    },
    {
      // 🚀 CHANGED: Now shows TODAY'S Bid Amount
      label: 'Today Bid Amount',
      value: money(stats.todayBidAmount),
      sub: `${stats.todayBids} bids today`,
      more: '/bids',
      accent: 'text-amber-400',
    },
    {
      label: 'Today Win Amount',
      value: money(stats.todayWinAmount),
      sub: `${stats.todayBids} bids today`,
      more: '/reports/winners',
      accent: 'text-purple-400',
    },
    {
      label: 'Wallet Amount',
      value: money(stats.walletAmount),
      sub: 'Across all users',
      more: '/wallet/transactions',
      accent: 'text-emerald-400',
    },
    {
      label: 'Today Amount Paid',
      value: money(stats.todayAmountPaid),
      sub: 'Approved withdrawals today',
      more: '/reports/withdraw',
      accent: 'text-pink-400',
    },
    {
      label: 'Today Total Deposit Bonus',
      value: money(stats.todayDepositBonus),
      sub: 'Bonus credited today',
      more: '/wallet/transactions',
      accent: 'text-yellow-400',
    },
    {
      label: 'Banned Users',
      value: stats.bannedUsers,
      sub: 'Deactivated accounts',
      more: '/users?status=inactive',
      accent: stats.bannedUsers > 0 ? 'text-red-400' : 'text-slate-300',
    },
    {
      label: 'Today Total Deposits',
      value: money(stats.todayDeposits),
      sub: `Deposit + Bonus (${stats.pendingDeposits} pending)`,
      more: '/deposits',
      accent: 'text-green-400',
    },
    {
      label: 'Today Total Withdraw',
      value: money(stats.todayWithdrawals),
      sub: `All requests (${stats.pendingWithdrawals} pending)`,
      more: '/wallet/withdrawals',
      accent: stats.pendingWithdrawals > 0 ? 'text-red-400' : 'text-slate-300',
    },
    {
      label: 'Today Manual Deposits',
      value: money(stats.todayManualDeposits),
      sub: 'Deposits without bonus',
      more: '/wallet/transactions',
      accent: 'text-cyan-400',
    },
    {
      label: 'Today Manual Withdraw',
      value: money(stats.todayManualWithdrawals),
      sub: 'Admin cashout from user wallets',
      more: '/wallet/transactions',
      accent: 'text-orange-400',
    },
    {
      // 🚀 ADDED: Separate card for ALL-TIME Total Bid Amount
      label: 'Total Bid Amount (All Time)',
      value: money(stats.totalBidAmount),
      sub: `${stats.totalBids} total bids`,
      more: '/bids',
      accent: 'text-amber-200',
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">Dashboard</h1>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Updated: {new Date().toLocaleTimeString('en-IN')}
        </span>
      </div>

      {stats.pendingWithdrawals > 0 && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg p-3 md:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm truncate">
              <strong>{stats.pendingWithdrawals}</strong> withdraw request
              {stats.pendingWithdrawals > 1 ? 's' : ''} pending
            </p>
          </div>
          <Link to="/wallet/withdrawals" className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-medium flex-shrink-0">
            Review
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-brand-card border border-brand-border rounded-lg overflow-hidden flex flex-col"
          >
            <div className="p-3 md:p-4 flex-1 flex flex-col">
              <p
                className={`text-xl sm:text-2xl md:text-3xl font-bold ${c.accent} break-words leading-tight`}
              >
                {c.value}
              </p>

              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-medium mt-1.5 leading-tight">
                {c.label}
              </p>

              <p className="hidden md:block text-xs text-slate-500 mt-1">
                {c.sub}
              </p>
            </div>

            <Link
              to={c.more}
              className="block text-center text-[11px] md:text-xs bg-slate-800 hover:bg-brand-accent hover:text-slate-900 text-slate-300 py-2 border-t border-brand-border transition-colors font-semibold"
            >
              More info
            </Link>
          </div>
        ))}
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg p-4 md:p-5">
        <h2 className="text-sm font-bold text-slate-200 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[
            { label: 'All Users', to: '/users' },
            { label: 'Withdrawals', to: '/wallet/withdrawals' },
            { label: 'UPI Verify', to: '/wallet/upi' },
            { label: 'Notice', to: '/notice' },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="text-center text-sm py-3 px-2 rounded bg-slate-800/60 hover:bg-brand-accent hover:text-slate-900 text-slate-300 font-medium transition-colors"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}