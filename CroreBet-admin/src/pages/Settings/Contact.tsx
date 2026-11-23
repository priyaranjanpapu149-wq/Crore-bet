import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function Contact() {
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsapp2, setWhatsapp2] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api
      .get('/admin/settings')
      .then((r) => {
        const s = r.data.data || {};
        setWhatsapp(s.whatsapp || '');
        setWhatsapp2(s.whatsapp2 || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!whatsapp) return setError('Enter WhatsApp number');
    if (!whatsapp2) return setError('Enter Call number');
    if (!/^\d{10,15}$/.test(whatsapp))
      return setError('WhatsApp number must be 10-15 digits');
    if (!/^\d{10,15}$/.test(whatsapp2))
      return setError('Call number must be 10-15 digits');

    setSaving(true);
    try {
      await api.post('/admin/settings', { whatsapp, whatsapp2 });
      setSuccess('Contact details saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Contact Us</h1>
        <p className="text-xs text-slate-500 mt-1">
          Update WhatsApp and Call numbers shown on the website and app
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-sm font-bold text-brand-accent uppercase tracking-wider mb-4 pb-3 border-b border-brand-border">
              Contact Details
            </h2>

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

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  className="input font-mono"
                  placeholder="e.g. 919876543210"
                  value={whatsapp}
                  onChange={(e) =>
                    setWhatsapp(e.target.value.replace(/\D/g, ''))
                  }
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Include country code (e.g. 91 for India)
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Call Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  className="input font-mono"
                  placeholder="e.g. 919876543210"
                  value={whatsapp2}
                  onChange={(e) =>
                    setWhatsapp2(e.target.value.replace(/\D/g, ''))
                  }
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Include country code (e.g. 91 for India)
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-sm font-bold text-brand-accent mb-3">
              Preview
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              This is how users see the contact options
            </p>

            <div className="space-y-3">
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/50 rounded p-3 hover:border-emerald-500/60 transition"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">💬</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-emerald-400 font-semibold">
                    WhatsApp Support
                  </p>
                  <p className="font-mono text-sm text-slate-200 truncate">
                    {whatsapp || '—'}
                  </p>
                </div>
              </a>

              <a
                href={`tel:${whatsapp2}`}
                className="flex items-center gap-3 bg-blue-900/20 border border-blue-700/50 rounded p-3 hover:border-blue-500/60 transition"
              >
                <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">📞</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-blue-400 font-semibold">
                    Call Support
                  </p>
                  <p className="font-mono text-sm text-slate-200 truncate">
                    {whatsapp2 || '—'}
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}