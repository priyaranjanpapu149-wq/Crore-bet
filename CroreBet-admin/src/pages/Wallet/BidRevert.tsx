import { useEffect, useState } from 'react';
import api from '../../api/axios';
import SearchSelect from '../../components/SearchSelect';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { fmtDateTime, todayLocal } from '../../utils/date';

interface Bid {
  id: string;
  userName: string;
  userMobile: string;
  amount: number;
  digits: string;
  gameType: string;
  session: string | null;
  bidDate: string;
}

interface Market {
  id: string;
  name: string;
}

export default function BidRevert() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  const [date, setDate] = useState(todayLocal());
  const [marketId, setMarketId] = useState('');

  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [confirmModal, setConfirmModal] = useState(false);
  const [refunding, setRefunding] = useState(false);

  // Load markets for dropdown
  useEffect(() => {
    api
      .get('/admin/games')
      .then((r) => setMarkets(r.data.data || []))
      .catch(() => {})
      .finally(() => setMarketsLoading(false));
  }, []);

  const selectedMarket = markets.find((m) => m.id === marketId);

  // Load bids for the selected date + market
  const loadBids = async () => {
    setError('');
    setSuccess('');
    if (!date) return setError('Select a date');
    if (!marketId) return setError('Select a game');

    setLoading(true);
    try {
      const { data } = await api.get('/admin/bids/by-market', {
        params: { marketId, date },
      });
      setBids(data.data || []);
      setLoaded(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  // Clear & refund all bids
  const doRefund = async () => {
    if (!date || !marketId) return;
    setRefunding(true);
    try {
      const { data } = await api.post('/admin/bids/revert', {
        date,
        marketId,
      });
      setSuccess(
        `Refunded ₹${Number(data.data.totalRefund).toLocaleString()} across ${
          data.data.refunded
        } bids`
      );
      setConfirmModal(false);
      setBids([]);
      setLoaded(false);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Revert failed');
      setConfirmModal(false);
    } finally {
      setRefunding(false);
    }
  };

  const totalAmount = bids.reduce((s, b) => s + Number(b.amount), 0);

  const columns = [
    {
      key: 'sn',
      label: '#',
      render: (_: Bid) => {
        const i = bids.indexOf(_);
        return <span className="text-slate-500">{i + 1}</span>;
      },
    },
    {
      key: 'userName',
      label: 'User Name',
      render: (b: Bid) => (
        <span className="text-slate-100 font-medium">{b.userName}</span>
      ),
    },
    {
      key: 'userMobile',
      label: 'User Mobile',
      render: (b: Bid) => (
        <span className="font-mono text-xs text-slate-400">{b.userMobile}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Bid Points',
      render: (b: Bid) => (
        <span className="font-bold text-amber-400">
          ₹{Number(b.amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'digits',
      label: 'Bid Number',
      render: (b: Bid) => (
        <span className="font-mono text-sm text-slate-200">{b.digits}</span>
      ),
    },
    {
      key: 'gameType',
      label: 'Game',
      render: (b: Bid) => (
        <span className="text-xs text-slate-400">
          {b.gameType}
          {b.session ? ` (${b.session})` : ''}
        </span>
      ),
    },
    {
      key: 'bidDate',
      label: 'Date',
      render: (b: Bid) => (
        <span className="text-xs text-slate-400">{fmtDateTime(b.bidDate)}</span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Bid Revert</h1>
          <p className="text-xs text-slate-500 mt-1">
            Refund all bids for a selected market and date
          </p>
        </div>
      </div>

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

      {/* Filters */}
      <div className="card mb-4">
        <h3 className="text-sm font-bold text-brand-accent mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Game</label>
            <SearchSelect
              options={markets.map((m) => ({ value: m.id, label: m.name }))}
              value={marketId}
              onChange={setMarketId}
              placeholder="Select Game"
              loading={marketsLoading}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadBids}
              disabled={loading || !marketId}
              className="btn-primary w-full disabled:opacity-40"
            >
              {loading ? 'Loading...' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>

      {/* Refund button — always visible */}
      <div className="card mb-4 text-center">
        <button
          onClick={() => setConfirmModal(true)}
          disabled={!date || !marketId || bids.length === 0}
          className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear & Refund All
        </button>
        <p className="text-xs text-slate-500 mt-2">
          {!date || !marketId
            ? 'Select a date and game first'
            : bids.length === 0
            ? 'No bids loaded — nothing to refund'
            : `${bids.length} bids · ₹${totalAmount.toLocaleString()} to refund`}
        </p>
      </div>

      {/* History table */}
      <div className="card">
        <h3 className="text-sm font-bold text-brand-accent mb-4">History</h3>
        {!loaded ? (
          <p className="text-slate-500 text-sm text-center py-8">
            Select a date and game, then click SAVE
          </p>
        ) : bids.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No bids found for this date and market
          </p>
        ) : (
          <DataTable
            columns={columns}
            rows={bids}
            loading={loading}
            empty="No bids"
          />
        )}
      </div>

      {/* Confirm modal */}
      <Modal
        open={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Bid Revert"
      >
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-sm">
            <p className="text-red-300 font-semibold">⚠ This cannot be undone</p>
            <p className="text-red-300/80 text-xs mt-1">
              All {bids.length} bids will be refunded to users' wallets and the
              bid records will be permanently deleted.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Market</p>
              <p className="text-slate-200">{selectedMarket?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Date</p>
              <p className="text-slate-200">{date}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Total Bids</p>
              <p className="text-slate-200">{bids.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">
                Total Refund
              </p>
              <p className="text-emerald-400 font-bold">
                ₹{totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setConfirmModal(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            >
              Cancel
            </button>
            <button
              onClick={doRefund}
              disabled={refunding}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded text-sm disabled:opacity-40"
            >
              {refunding ? 'Refunding...' : 'Confirm & Refund All'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}