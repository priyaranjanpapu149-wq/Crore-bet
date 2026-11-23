import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface Market {
  id: string;
  name: string;
  slug: string;
  type: string;
  openTime: string | null;
  closeTime: string | null;
  days: string | null;
  active: boolean;
  autoResult: boolean;
}

const WEEK = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

type DayConfig = {
  timetype: 'open' | 'close';
  open: string;
  close: string;
};

// ---------- Time helpers (24h ↔ 12h) ----------
function to24(h12: number, min: string, ampm: 'AM' | 'PM'): string {
  let h = h12 % 12;
  if (ampm === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function parse24(t: string | null): { h12: number; min: string; ampm: 'AM' | 'PM' } {
  if (!t || !/^\d{1,2}:\d{2}/.test(t)) {
    return { h12: 12, min: '00', ampm: 'AM' };
  }
  const [hh, mm] = t.split(':');
  const h = parseInt(hh, 10) || 0;
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { h12, min: mm.slice(0, 2), ampm };
}

function fmt12(t: string | null): string {
  if (!t) return '—';
  const { h12, min, ampm } = parse24(t);
  return `${String(h12).padStart(2, '0')}:${min} ${ampm}`;
}

// ---------- 12-hour Time Picker ----------
function Time12({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { h12, min, ampm } = parse24(value);

  const updateHour = (h: number) => onChange(to24(h, min, ampm));
  const updateMin = (m: string) => onChange(to24(h12, m, ampm));
  const updateAmPm = (ap: 'AM' | 'PM') => onChange(to24(h12, min, ap));

  return (
    <div className={`flex items-center gap-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <select
        className="input py-1.5 text-xs w-[70px]"
        value={h12}
        onChange={(e) => updateHour(Number(e.target.value))}
        disabled={disabled}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-slate-500 text-xs">:</span>
      <select
        className="input py-1.5 text-xs w-[70px]"
        value={min}
        onChange={(e) => updateMin(e.target.value)}
        disabled={disabled}
      >
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <div className="flex rounded overflow-hidden border border-brand-border">
        <button
          type="button"
          onClick={() => updateAmPm('AM')}
          disabled={disabled}
          className={`px-2 py-1.5 text-xs font-medium transition ${
            ampm === 'AM'
              ? 'bg-brand-accent text-slate-900'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => updateAmPm('PM')}
          disabled={disabled}
          className={`px-2 py-1.5 text-xs font-medium transition ${
            ampm === 'PM'
              ? 'bg-brand-accent text-slate-900'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          PM
        </button>
      </div>
    </div>
  );
}

// ---------- Days parsing — robust ----------
function parseDays(
  days: string | null,
  defaultOpen: string,
  defaultClose: string
): Record<string, DayConfig> {
  const config: Record<string, DayConfig> = {};
  for (const d of WEEK) {
    config[d] = { timetype: 'open', open: defaultOpen, close: defaultClose };
  }
  if (!days || days.trim() === '') return config;

  const parts = days.split(/,(?=[A-Z]+\s*\()/);
  for (const raw of parts) {
    const p = raw.trim();
    const m = p.match(/^([A-Z]+)\s*\((.*)\)$/);
    if (!m) continue;
    const day = m[1];
    const inner = m[2].trim();
    if (!WEEK.includes(day as any)) continue;

    if (/^CLOSED$/i.test(inner)) {
      config[day] = { timetype: 'close', open: '', close: '' };
    } else {
      const dashIdx = inner.indexOf('-');
      if (dashIdx < 0) continue;
      const op = inner.slice(0, dashIdx).trim();
      const cl = inner.slice(dashIdx + 1).trim();
      if (!op || !cl) continue;
      config[day] = { timetype: 'open', open: op, close: cl };
    }
  }
  return config;
}

// ---------- Days serialization — only write days that differ from default ----------
function serializeDays(
  days: Record<string, DayConfig>,
  defaultOpen: string,
  defaultClose: string
): string {
  const parts: string[] = [];
  for (const d of WEEK) {
    const cfg = days[d];
    if (!cfg) continue;
    if (cfg.timetype === 'close') {
      parts.push(`${d}(CLOSED)`);
    } else {
      const op = cfg.open || defaultOpen;
      const cl = cfg.close || defaultClose;
      if (op !== defaultOpen || cl !== defaultClose) {
        parts.push(`${d}(${op}-${cl})`);
      }
    }
  }
  return parts.join(',');
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  openTime: '10:00',
  closeTime: '23:00',
  active: true,
  autoResult: false,
  specialTimings: false,
  days: {} as Record<string, DayConfig>,
};

export default function GameProviders() {
  const [rows, setRows] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Market | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/games');
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const initDays = (open: string, close: string, daysStr: string | null) =>
    parseDays(daysStr, open, close);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      days: initDays('10:00', '23:00', null),
    });
    setShowModal(true);
  };

  const openEdit = (m: Market) => {
    setEditing(m);
    const open = m.openTime || '10:00';
    const close = m.closeTime || '23:00';
    const parsedDays = initDays(open, close, m.days);
    const hasSpecial = WEEK.some(
      (d) =>
        parsedDays[d].timetype === 'close' ||
        parsedDays[d].open !== open ||
        parsedDays[d].close !== close
    );
    setForm({
      name: m.name,
      slug: m.slug,
      openTime: open,
      closeTime: close,
      active: m.active,
      autoResult: m.autoResult,
      specialTimings: hasSpecial,
      days: parsedDays,
    });
    setShowModal(true);
  };

  const updateDay = (day: string, patch: Partial<DayConfig>) => {
    setForm((f) => ({
      ...f,
      days: { ...f.days, [day]: { ...f.days[day], ...patch } },
    }));
  };

  // Cascade default changes → any day still holding the old default auto-updates
  const setDefaultOpenTime = (newTime: string) => {
    const oldTime = form.openTime;
    setForm((f) => {
      const nextDays = { ...f.days };
      for (const d of WEEK) {
        const cfg = nextDays[d];
        if (cfg && cfg.timetype === 'open' && cfg.open === oldTime) {
          nextDays[d] = { ...cfg, open: newTime };
        }
      }
      return { ...f, openTime: newTime, days: nextDays };
    });
  };

  const setDefaultCloseTime = (newTime: string) => {
    const oldTime = form.closeTime;
    setForm((f) => {
      const nextDays = { ...f.days };
      for (const d of WEEK) {
        const cfg = nextDays[d];
        if (cfg && cfg.timetype === 'open' && cfg.close === oldTime) {
          nextDays[d] = { ...cfg, close: newTime };
        }
      }
      return { ...f, closeTime: newTime, days: nextDays };
    });
  };

  const applyDefaultsToAllDays = () => {
    const next: Record<string, DayConfig> = {};
    for (const d of WEEK) {
      next[d] = { timetype: 'open', open: form.openTime, close: form.closeTime };
    }
    setForm((f) => ({ ...f, days: next }));
  };

  const save = async () => {
    if (!form.name.trim()) return alert('Name required');
    if (!form.slug.trim()) return alert('Slug required');

    const daysString = form.specialTimings
      ? serializeDays(form.days, form.openTime, form.closeTime)
      : null;

    const payload: any = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      openTime: form.openTime,
      closeTime: form.closeTime,
      days: daysString,
      active: form.active,
      autoResult: form.autoResult,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/games/${editing.id}`, payload);
      } else {
        await api.post('/admin/games', { ...payload, type: 'regular' });
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m: Market) => {
    try {
      await api.post(`/admin/games/${m.id}/toggle-active`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const toggleAuto = async (m: Market) => {
    try {
      await api.post(`/admin/games/${m.id}/toggle-auto-result`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const del = async (m: Market) => {
    if (!confirm(`Delete market "${m.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/games/${m.id}`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100">Games</h1>
          <p className="text-xs text-slate-500 mt-1">All markets / games</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          + Add Game
        </button>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No games. Click "Add Game".</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase w-12">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Game Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Open Time</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Close Time</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Days</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Auto Result</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={m.id} className="border-t border-brand-border hover:bg-slate-800/30">
                    <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-3 text-slate-100 font-semibold uppercase">{m.name}</td>
                    <td className="px-3 py-3 text-slate-300 font-mono text-xs">{fmt12(m.openTime)}</td>
                    <td className="px-3 py-3 text-slate-300 font-mono text-xs">{fmt12(m.closeTime)}</td>
                    <td className="px-3 py-3 text-slate-400 text-[11px] max-w-[360px]">
                      {m.days ? (
                        <div className="font-mono leading-relaxed break-words" title={m.days}>
                          {m.days.split(/,(?=[A-Z]+\s*\()/).map((part, idx) => {
                            const isClosed = part.includes('CLOSED');
                            return (
                              <span
                                key={idx}
                                className={isClosed ? 'text-red-400' : 'text-slate-400'}
                              >
                                {idx > 0 ? ', ' : ''}
                                {part.trim()}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleAuto(m)}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          m.autoResult ? 'bg-emerald-700 text-white' : 'bg-red-800 text-white'
                        }`}
                      >
                        {m.autoResult ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleActive(m)}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          m.active ? 'bg-emerald-700 text-white' : 'bg-red-800 text-white'
                        }`}
                      >
                        {m.active ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEdit(m)}
                          className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => del(m)}
                          className="text-xs bg-red-800 hover:bg-red-700 text-white px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-brand-card border border-brand-border rounded-lg p-5 w-full max-w-4xl space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">
                {editing ? 'Edit Game' : 'Add New Game'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Name + Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Game Name *</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editing ? f.slug : autoSlug(name),
                    }));
                  }}
                  placeholder="Kalyan"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Slug *</label>
                <input
                  type="text"
                  className="input mt-1 font-mono text-xs"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="kalyan"
                />
              </div>
            </div>

            {/* Default open/close — cascades to per-day */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Default Open Time</label>
                <div className="mt-1">
                  <Time12 value={form.openTime} onChange={setDefaultOpenTime} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Default Close Time</label>
                <div className="mt-1">
                  <Time12 value={form.closeTime} onChange={setDefaultCloseTime} />
                </div>
              </div>
            </div>

            {/* Special timings toggle */}
            <div>
              <label className="text-xs text-slate-500">Does market have special timings?</label>
              <select
                className="input mt-1"
                value={form.specialTimings ? 'Yes' : 'No'}
                onChange={(e) =>
                  setForm({ ...form, specialTimings: e.target.value === 'Yes' })
                }
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* Per-day timings */}
            {form.specialTimings && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-brand-accent">Timings</h4>
                  <button
                    onClick={applyDefaultsToAllDays}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded"
                  >
                    Fill all with defaults
                  </button>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                  {WEEK.map((day) => {
                    const cfg = form.days[day] || { timetype: 'open', open: '', close: '' };
                    return (
                      <div key={day} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2 text-slate-300 font-medium text-xs uppercase">
                          {day}
                        </div>
                        <div className="col-span-2">
                          <select
                            className="input py-1.5 text-xs"
                            value={cfg.timetype}
                            onChange={(e) =>
                              updateDay(day, { timetype: e.target.value as any })
                            }
                          >
                            <option value="open">Open</option>
                            <option value="close">Close</option>
                          </select>
                        </div>
                        <div className="col-span-4">
                          <Time12
                            value={cfg.open || form.openTime}
                            onChange={(v) => updateDay(day, { open: v })}
                            disabled={cfg.timetype === 'close'}
                          />
                        </div>
                        <div className="col-span-4">
                          <Time12
                            value={cfg.close || form.closeTime}
                            onChange={(v) => updateDay(day, { close: v })}
                            disabled={cfg.timetype === 'close'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-500">
                  Tip: set "Close" for days the market is closed.
                </p>

                {/* Live preview */}
                <div className="bg-slate-900/70 border border-brand-border rounded p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    Preview (what gets saved to database)
                  </p>
                  <code className="text-xs text-brand-accent font-mono break-all">
                    {serializeDays(form.days, form.openTime, form.closeTime) || '—'}
                  </code>
                </div>
              </div>
            )}

            {/* Active + Auto Result */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4"
                />
                Active
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.autoResult}
                  onChange={(e) => setForm({ ...form, autoResult: e.target.checked })}
                  className="w-4 h-4"
                />
                Auto Result
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-brand-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded text-sm"
              >
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}