import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DataTable from '../../components/DataTable';
import Pagination from '../../components/Pagination';

export interface GameTypeConfig {
  slug: string;
  title: string;
  gameType: string;
  pattern: string;
  hint: string;
  custom?: boolean;
  accentColor?: string;
}

export const GAME_TYPES: GameTypeConfig[] = [
  {
    slug: 'single',
    title: 'Single Digit',
    gameType: 'single',
    pattern: '1 digit (0-9)',
    hint: 'Guess a single digit 0-9',
    accentColor: 'text-blue-400',
  },
  {
    slug: 'jodi',
    title: 'Jodi Digit',
    gameType: 'jodi',
    pattern: '2 digits (00-99)',
    hint: 'Open digit + Close digit combined',
    accentColor: 'text-purple-400',
  },
  {
    slug: 'single-pana',
    title: 'Single Pana',
    gameType: 'single_panna',
    pattern: '3 distinct digits',
    hint: 'Panna with all 3 digits different',
    accentColor: 'text-cyan-400',
  },
  {
    slug: 'double-pana',
    title: 'Double Pana',
    gameType: 'double_panna',
    pattern: '3 digits, 2 same',
    hint: 'Panna with exactly 2 digits same',
    accentColor: 'text-teal-400',
  },
  {
    slug: 'triple-pana',
    title: 'Triple Pana',
    gameType: 'triple_panna',
    pattern: '3 same digits',
    hint: 'Panna with all 3 digits same (000, 111, ...)',
    accentColor: 'text-emerald-400',
  },
  {
    slug: 'half-sangam',
    title: 'Half Sangam',
    gameType: 'half_sangam',
    pattern: 'digit-panna or panna-digit',
    hint: 'Open digit + Close panna, or vice versa',
    accentColor: 'text-amber-400',
  },
  {
    slug: 'full-sangam',
    title: 'Full Sangam',
    gameType: 'full_sangam',
    pattern: 'panna - panna',
    hint: 'Open panna + Close panna',
    accentColor: 'text-orange-400',
  },
  {
    slug: 'personal',
    title: 'Personal Games',
    gameType: '',
    pattern: 'custom game types',
    hint: 'All non-standard game types',
    custom: true,
    accentColor: 'text-pink-400',
  },
];

export function GameTypePage({ config }: { config: GameTypeConfig }) {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/bids', {
        params: {
          gameType: config.custom ? undefined : config.gameType,
          custom: config.custom ? 'true' : undefined,
          search: search || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: 50,
        },
      });
      setRows(data.data.rows);
      setSummary(data.data.summary);
      setTotal(data.data.total);
      setPages(data.data.pages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
  }, [config.slug]);

  useEffect(() => { load(); }, [config.slug, page, status, from, to]);

  const columns = [
    {
      key: 'sn', label: '#',
      render: (b: any) => {
        const i = rows.indexOf(b);
        return <span className="text-slate-500 text-xs">{((page - 1) * 50) + i + 1}</span>;
      },
    },
    {
      key: 'user', label: 'User',
      render: (b: any) => (
        <div>
          <div className="text-sm text-slate-100">{b.user?.name || '—'}</div>
          <div className="font-mono text-xs text-slate-400">{b.user?.mobile || '—'}</div>
        </div>
      ),
    },
    {
      key: 'market', label: 'Market',
      render: (b: any) => <span className="text-sm uppercase">{b.market?.name || '—'}</span>,
    },
    {
      key: 'session', label: 'Session',
      render: (b: any) => b.session ? (
        <span className={`px-2 py-0.5 rounded text-xs ${
          b.session === 'open' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
        }`}>{b.session}</span>
      ) : <span className="text-xs text-slate-500">—</span>,
    },
    {
      key: 'gameType', label: 'Type',
      render: (b: any) => (
        <span className="text-xs text-slate-400">{b.gameType}</span>
      ),
    },
    {
      key: 'digits', label: 'Bet Number',
      render: (b: any) => (
        <span className={`font-mono text-base font-bold ${config.accentColor || 'text-amber-400'}`}>
          {b.digits}
        </span>
      ),
    },
    {
      key: 'amount', label: 'Points',
      render: (b: any) => (
        <span className="font-medium text-slate-100">₹{Number(b.amount).toLocaleString()}</span>
      ),
    },
    {
      key: 'payout', label: 'Payout',
      render: (b: any) => (
        <span className="text-xs text-emerald-400">
          ₹{Number(b.payout).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (b: any) => (
        <span className={`px-2 py-0.5 rounded text-xs ${
          b.status === 'won' ? 'bg-emerald-900 text-emerald-300' :
          b.status === 'lost' ? 'bg-red-900 text-red-300' :
          'bg-amber-900 text-amber-300'
        }`}>{b.status}</span>
      ),
    },
    {
      key: 'bidDate', label: 'Date',
      render: (b: any) => (
        <span className="text-xs text-slate-400">
          {new Date(b.bidDate).toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{config.title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {config.hint} · Format: <span className="font-mono text-slate-400">{config.pattern}</span>
          </p>
        </div>
        <button onClick={load} className="btn-primary text-sm">Refresh</button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="card">
            <p className="text-xs text-slate-400">Total Bids</p>
            <p className="text-xl font-bold text-slate-100">{total}</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">Total Points</p>
            <p className="text-xl font-bold text-slate-100">
              ₹{summary.totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">Won Amount</p>
            <p className="text-xl font-bold text-emerald-400">
              ₹{summary.wonAmount.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Payout: ₹{summary.wonPayout.toLocaleString()}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">Lost Amount</p>
            <p className="text-xl font-bold text-red-400">
              ₹{summary.lostAmount.toLocaleString()}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">Pending Amount</p>
            <p className="text-xl font-bold text-amber-400">
              ₹{summary.pendingAmount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-3">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Search mobile or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
        />
        <select
          className="input w-36"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <input
          type="date"
          className="input w-40"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
        />
        <input
          type="date"
          className="input w-40"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
        />
        <button onClick={() => { setPage(1); load(); }} className="btn-primary">
          Search
        </button>
        <button
          onClick={() => {
            setSearch(''); setStatus(''); setFrom(''); setTo(''); setPage(1);
            setTimeout(load, 0);
          }}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          empty={`No ${config.title.toLowerCase()} bids yet`}
        />
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
    </div>
  );
}