import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface Rates {
  single: number;
  jodi: number;
  single_panna: number;
  double_panna: number;
  triple_panna: number;
  half_sangam: number;
  full_sangam: number;
}

const FIELDS: { key: keyof Rates; label: string }[] = [
  { key: 'single',       label: 'Single Digit' },
  { key: 'jodi',         label: 'Jodi Digit'   },
  { key: 'single_panna', label: 'Single Pana'  },
  { key: 'double_panna', label: 'Double Pana'  },
  { key: 'triple_panna', label: 'Triple Pana'  },
  { key: 'half_sangam',  label: 'Half Sangam'  },
  { key: 'full_sangam',  label: 'Full Sangam'  },
];

export default function GameRates() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/admin/game-rates')
      .then((r) => setRates(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!rates) return;
    if (!confirm('Save new rates? These apply to all markets.')) return;
    setSaving(true);
    try {
      await api.post('/admin/game-rates', rates);
      alert('Rates saved');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !rates) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">Game Rates</h1>
        <p className="text-xs text-slate-500 mt-1">
          Value = payout multiplier. E.g. single = 9.5 means ₹1 bet pays ₹9.5.
        </p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-lg p-5 space-y-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <h3 className="text-sm font-semibold text-brand-accent mb-2">{f.label}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">1 ₹ bet pays</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input w-32"
                value={rates[f.key]}
                onChange={(e) =>
                  setRates({ ...rates, [f.key]: Number(e.target.value) })
                }
              />
              <span className="text-xs text-slate-500">₹</span>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-brand-border">
          <button onClick={save} disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}