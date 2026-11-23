import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

interface User {
  id: string;
  mobile: string;
  name: string;
  wallet: string;
  verified: boolean;
  active: boolean;
  createdAt: string;
}

export default function UnapprovedUsers() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users/unapproved');
      setRows(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const verify = async (id: string) => {
    await api.post(`/admin/users/${id}/verify`, { verified: true });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Un-approved Users</h1>
          <p className="text-xs text-slate-500 mt-1">
            Users pending verification · {rows.length} in queue
          </p>
        </div>
        <Link to="/users" className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded">
          ← All Users
        </Link>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Name</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Mobile</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Wallet</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Joined</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-12">
                    All users are verified. Nothing pending.
                  </td>
                </tr>
              ) : (
                rows.map((u, idx) => (
                  <tr key={u.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-3 text-slate-200 font-medium">{u.name}</td>
                    <td className="px-3 py-3">
                      <div className="font-mono text-slate-300">{u.mobile}</div>
                      <div className="flex gap-2 mt-1">
                        <a
                          href={`https://api.whatsapp.com/send?phone=91${u.mobile}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300"
                        >
                          WhatsApp
                        </a>
                        <a
                          href={`tel:+91${u.mobile}`}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Call
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-emerald-400 font-medium">
                      ₹{Number(u.wallet).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => verify(u.id)}
                          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded font-medium"
                        >
                          Approve
                        </button>
                        <Link
                          to={`/users/${u.id}`}
                          className="text-xs bg-brand-accent hover:bg-yellow-500 text-slate-900 px-3 py-1 rounded font-medium"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}