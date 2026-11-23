import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

interface User {
  id: string;
  mobile: string;
  name: string;
  wallet: string;
  active: boolean;
  verified: boolean;
  referCode: string | null;
  referredBy: string | null;
  createdAt: string;
  lastSeen: string | null;
}

export default function UserList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const limit = Number(searchParams.get('limit')) || 20;
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const sort = searchParams.get('sort') || 'createdAt';

  const [searchInput, setSearchInput] = useState(search);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { search, status, sort, page, limit },
      });
      setRows(data.data.rows);
      setTotal(data.data.total);
      setPages(data.data.pages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, limit, search, status, sort]);

  const onDelete = async (u: User) => {
    if (!confirm(`Delete user ${u.mobile} (${u.name})? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const onToggleActive = async (u: User) => {
    try {
      await api.post(`/admin/users/${u.id}/active`, { active: !u.active });
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">All Users</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/users/unapproved"
            className="text-xs bg-amber-800 hover:bg-amber-700 text-amber-100 px-3 py-2 rounded font-medium"
          >
            Un-approved
          </Link>
          <span className="text-sm text-slate-400">{total} total</span>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder="Search mobile, name, refer code..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateParam('search', searchInput)}
          />
          <select
            className="input md:w-40"
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="unverified">Unverified</option>
          </select>
          <select
            className="input md:w-52"
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
          >
            <option value="createdAt">Sort: Registration</option>
            <option value="name">Sort: Name</option>
            <option value="wallet">Sort: Wallet (high → low)</option>
            <option value="mobile">Sort: Mobile</option>
          </select>
          <select
            className="input md:w-28"
            value={limit}
            onChange={(e) => updateParam('limit', e.target.value)}
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
          <button
            onClick={() => updateParam('search', searchInput)}
            className="btn-primary"
          >
            Search
          </button>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">User</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Mobile</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Wallet</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Refer</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Joined</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500 py-12">
                    No users found
                  </td>
                </tr>
              ) : (
                rows.map((u, idx) => (
                  <tr key={u.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3 text-slate-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-200">{u.name}</div>
                      {u.referCode && (
                        <div className="text-xs text-slate-500 font-mono">{u.referCode}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-300">{u.mobile}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-emerald-400 font-semibold">
                        ₹{Number(u.wallet).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-mono text-slate-400">
                        {u.referredBy || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => onToggleActive(u)}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition ${
                            u.active
                              ? 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800'
                              : 'bg-red-900/50 text-red-300 hover:bg-red-800'
                          }`}
                        >
                          {u.active ? 'Active' : 'Banned'}
                        </button>
                        {!u.verified && (
                          <span className="px-2 py-0.5 rounded text-xs bg-amber-900/50 text-amber-300">
                            Unverified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-end">
                        <Link
                          to={`/users/${u.id}`}
                          className="text-xs bg-brand-accent hover:bg-yellow-500 text-slate-900 px-2 py-1 rounded font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => onDelete(u)}
                          className="text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border">
            <span className="text-xs text-slate-500">
              Page {page} of {pages} · {total} users
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => updateParam('page', String(page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                Prev
              </button>
              <button
                onClick={() => updateParam('page', String(page + 1))}
                disabled={page >= pages}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}