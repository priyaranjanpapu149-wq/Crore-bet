import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface Site {
  id: string;
  site: string;
  siteUrl: string;
  status: 'working' | 'not_working';
  lastCheck: string | null;
  priority: number;
  active: boolean;
}

export default function AutoResult() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newSite, setNewSite] = useState({
    site: '',
    siteUrl: '',
    priority: 0,
    active: true,
  });

  const loadConfig = async () => {
    const { data } = await api.get('/admin/auto-result/config');
    setEnabled(data.data.enabled);
  };

  const loadSites = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/auto-result/sites');
      setSites(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadSites();
  }, []);

  const toggleEnabled = async (v: boolean) => {
    setEnabled(v);
    setSaving(true);
    try {
      await api.post('/admin/auto-result/config', { enabled: v });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
      setEnabled(!v);
    } finally {
      setSaving(false);
    }
  };

  const updateSite = (id: string, patch: Partial<Site>) => {
    setSites((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await api.post('/admin/auto-result/sites/bulk-update', {
        updates: sites.map((s) => ({
          id: s.id,
          priority: s.priority,
          active: s.active,
        })),
      });
      alert('Saved');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const checkOne = async (id: string) => {
    setChecking(id);
    try {
      await api.post('/admin/auto-result/sites/check', { id });
      await loadSites();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Check failed');
    } finally {
      setChecking(null);
    }
  };

  const checkAll = async () => {
    setChecking('all');
    try {
      await api.post('/admin/auto-result/sites/check', {});
      await loadSites();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Check failed');
    } finally {
      setChecking(null);
    }
  };

  const addSite = async () => {
    if (!newSite.site || !newSite.siteUrl) {
      return alert('Site name and URL required');
    }
    setSaving(true);
    try {
      await api.post('/admin/auto-result/sites', newSite);
      setShowAdd(false);
      setNewSite({ site: '', siteUrl: '', priority: 0, active: true });
      loadSites();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Add failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteSite = async (id: string, name: string) => {
    if (!confirm(`Delete site "${name}"?`)) return;
    try {
      await api.delete(`/admin/auto-result/sites/${id}`);
      loadSites();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const formatLastCheck = (s: string | null) => {
    if (!s) return 'Never';
    const d = new Date(s);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">
            Auto Result Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Result websites that the cron pings to fetch results for all markets.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm bg-brand-accent hover:bg-yellow-500 text-slate-900 px-3 py-2 rounded font-semibold"
        >
          + Add Site
        </button>
      </div>

      {/* Global toggle */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">
              Auto Result System
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Enable or disable automatic result fetching for all markets.
            </p>
          </div>
          {enabled !== null && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleEnabled(true)}
                disabled={saving}
                className={`px-4 py-2 rounded text-sm font-medium transition ${
                  enabled
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Enable
              </button>
              <button
                onClick={() => toggleEnabled(false)}
                disabled={saving}
                className={`px-4 py-2 rounded text-sm font-medium transition ${
                  !enabled
                    ? 'bg-red-700 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Disable
              </button>
              <span
                className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  enabled
                    ? 'bg-emerald-900/50 text-emerald-300'
                    : 'bg-red-900/50 text-red-300'
                }`}
              >
                {enabled ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sites table */}
      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
          <h2 className="text-sm font-bold text-slate-200">
            Result Sources ({sites.length})
          </h2>
          <button
            onClick={checkAll}
            disabled={checking !== null || sites.length === 0}
            className="flex items-center gap-1.5 text-xs bg-blue-800 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium disabled:opacity-40"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={checking === 'all' ? 'animate-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {checking === 'all' ? 'Checking...' : 'Refresh All'}
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : sites.length === 0 ? (
            <p className="text-center text-slate-500 py-12">
              No result sites configured. Click "Add Site" to add one.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Site Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">URL</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Last Checked</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Priority</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">On/Off</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s, idx) => (
                  <tr key={s.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-3 text-slate-200 font-medium">{s.site}</td>
                    <td className="px-3 py-3">
                      <a
                        href={s.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 font-mono truncate block max-w-[260px]"
                      >
                        {s.siteUrl}
                      </a>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            s.status === 'working'
                              ? 'bg-emerald-900/50 text-emerald-300'
                              : 'bg-red-900/50 text-red-300'
                          }`}
                        >
                          {s.status === 'working' ? 'WORKING' : 'NOT WORKING'}
                        </span>
                        <button
                          onClick={() => checkOne(s.id)}
                          disabled={checking === s.id}
                          className="text-slate-400 hover:text-blue-400 disabled:opacity-40"
                          title="Refresh status"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={checking === s.id ? 'animate-spin' : ''}
                          >
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatLastCheck(s.lastCheck)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        value={s.priority}
                        onChange={(e) =>
                          updateSite(s.id, { priority: Number(e.target.value) })
                        }
                        className="w-16 bg-slate-800 border border-brand-border text-slate-200 rounded px-2 py-1 text-center text-xs"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={s.active ? '1' : '0'}
                        onChange={(e) =>
                          updateSite(s.id, { active: e.target.value === '1' })
                        }
                        className={`text-xs rounded border-0 px-2 py-1 font-medium ${
                          s.active
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        <option value="1">ON</option>
                        <option value="0">OFF</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => deleteSite(s.id, s.site)}
                        className="text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {sites.length > 0 && (
          <div className="px-4 py-3 border-t border-brand-border flex justify-end">
            <button
              onClick={saveAll}
              disabled={saving}
              className="bg-brand-accent hover:bg-yellow-500 text-slate-900 font-semibold text-sm px-5 py-2 rounded disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Update All'}
            </button>
          </div>
        )}
      </div>

      {/* Add Modal — 3 fields only */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">Add Result Site</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="text-slate-400 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-500">Site Name *</label>
              <input
                type="text"
                className="input mt-1"
                value={newSite.site}
                onChange={(e) => setNewSite({ ...newSite, site: e.target.value })}
                placeholder="Dhankesari / Satta King / Kalyanmatka"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Site URL *</label>
              <input
                type="url"
                className="input mt-1"
                value={newSite.siteUrl}
                onChange={(e) => setNewSite({ ...newSite, siteUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">
                Priority (lower = checked first)
              </label>
              <input
                type="number"
                className="input mt-1"
                value={newSite.priority}
                onChange={(e) =>
                  setNewSite({ ...newSite, priority: Number(e.target.value) })
                }
                placeholder="0"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newSite.active}
                onChange={(e) =>
                  setNewSite({ ...newSite, active: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-slate-200">Active</span>
            </label>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={addSite}
                disabled={saving}
                className="px-4 py-2 bg-brand-accent text-slate-900 font-semibold rounded text-sm"
              >
                {saving ? 'Adding...' : 'Add Site'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}