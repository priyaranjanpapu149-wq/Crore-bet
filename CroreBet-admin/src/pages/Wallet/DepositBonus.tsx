import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface Bonus {
  id: string;
  min: number;
  max: number;
  bonus: number;
}

export default function DepositBonus() {
  const [rows, setRows] = useState<Bonus[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('min');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addMin, setAddMin] = useState('');
  const [addMax, setAddMax] = useState('');
  const [addBonus, setAddBonus] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/bonus', {
        params: {
          search: search || undefined,
          sort,
        },
      });
      setRows(data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  const resetForm = () => {
    setAddMin('');
    setAddMax('');
    setAddBonus('');
    setAddError('');
  };

  const submitAdd = async () => {
    setAddError('');
    const minN = Number(addMin);
    const maxN = Number(addMax);
    const bonusN = Number(addBonus);

    if (!addMin || !addMax || !addBonus) {
      return setAddError('All fields are required');
    }
    if (minN < 0 || maxN <= minN) {
      return setAddError('Max must be greater than Min');
    }
    if (bonusN <= 0) {
      return setAddError('Bonus must be greater than 0');
    }

    setSaving(true);
    try {
      await api.post('/admin/bonus', {
        min: minN,
        max: maxN,
        bonus: bonusN,
      });
      setShowAdd(false);
      resetForm();
      load();
    } catch (e: any) {
      setAddError(e.response?.data?.message || 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  const del = async (b: Bonus) => {
    if (
      !confirm(
        `Delete bonus tier ₹${b.min} – ₹${b.max} → ₹${b.bonus}? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/admin/bonus/${b.id}`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">
            Deposit Bonus
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {rows.length} tier{rows.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="btn-primary"
        >
          + Add Deposit Bonus
        </button>
      </div>

      {/* Filters */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">
              Search (min / max / bonus)
            </label>
            <input
              className="input"
              placeholder="e.g. 500"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSearch(searchInput);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Sort by</label>
            <select
              className="input"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="min">Minimum Deposit</option>
              <option value="max">Maximum Deposit</option>
              <option value="bonus">Bonus Amount</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setSearch(searchInput)}
              className="btn-primary flex-1"
            >
              Search
            </button>
            <button
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setSort('min');
              }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-16">
                  #
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Minimum Deposit
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Maximum Deposit
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Deposit Bonus
                </th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-32">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500 py-12">
                    No bonus tiers configured. Click "Add Deposit Bonus" to start.
                  </td>
                </tr>
              ) : (
                rows.map((b, idx) => (
                  <tr
                    key={b.id}
                    className="border-t border-brand-border hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-3 text-right text-slate-200 font-mono">
                      {money(b.min)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-200 font-mono">
                      {money(b.max)}
                    </td>
                    <td className="px-3 py-3 text-right text-emerald-400 font-bold">
                      {money(b.bonus)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => del(b)}
                        className="text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-brand-card border-2 border-brand-accent rounded-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <h2 className="text-lg font-bold text-brand-accent">
                Add Deposit Bonus
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              {addError && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">
                  {addError}
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Minimum Deposit (₹)
                </label>
                <input
                  type="number"
                  className="input"
                  value={addMin}
                  onChange={(e) => setAddMin(e.target.value)}
                  placeholder="e.g. 100"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Maximum Deposit (₹)
                </label>
                <input
                  type="number"
                  className="input"
                  value={addMax}
                  onChange={(e) => setAddMax(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Deposit Bonus (₹)
                </label>
                <input
                  type="number"
                  className="input"
                  value={addBonus}
                  onChange={(e) => setAddBonus(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>

              <p className="text-xs text-slate-500">
                Bonus will be credited to the user when their deposit falls in
                this range. Overlapping ranges are rejected.
              </p>
            </div>

            <div className="flex gap-2 justify-end px-5 py-4 border-t border-brand-border">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitAdd}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}