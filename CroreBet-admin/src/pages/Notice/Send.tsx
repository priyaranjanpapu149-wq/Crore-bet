import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
}

const TOPICS = [
  { value: 'all', label: 'All Users' },
  { value: 'notices', label: 'Notices subscribers' },
  { value: 'results', label: 'Results subscribers' },
  { value: 'offers', label: 'Offers subscribers' },
];

export default function SendNotification() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState('all');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fcmWarning, setFcmWarning] = useState('');
  const [history, setHistory] = useState<NotificationLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/admin/notification/history');
      setHistory(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFcmWarning('');

    if (!title.trim()) return setError('Title required');
    if (!body.trim()) return setError('Message required');
    if (title.length > 200) return setError('Title max 200 chars');
    if (body.length > 2000) return setError('Message max 2000 chars');

    setSending(true);
    try {
      const { data } = await api.post('/admin/notification/send', {
        title: title.trim(),
        body: body.trim(),
        topic,
      });

      if (data.data?.fcmSent) {
        setSuccess('Notification sent to all devices successfully');
      } else {
        setSuccess('Notification saved to log');
        setFcmWarning(
          data.data?.fcmError ||
            'FCM not configured — devices did not receive push. Notice was still saved.'
        );
      }

      setTitle('');
      setBody('');
      loadHistory();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    const h = String(dt.getHours() % 12 || 12).padStart(2, '0');
    const m = String(dt.getMinutes()).padStart(2, '0');
    const ampm = dt.getHours() >= 12 ? 'PM' : 'AM';
    return `${day}/${month}/${year}, ${h}:${m} ${ampm}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Send Notification</h1>
          <p className="text-xs text-slate-400 mt-1">
            Push a notification to all app users instantly
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-900/20 border border-emerald-700/50 rounded p-3 text-emerald-300 text-sm">
          ✅ {success}
        </div>
      )}
      {fcmWarning && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded p-3 text-amber-300 text-sm">
          ⚠ {fcmWarning}
        </div>
      )}

      {/* Form */}
      <div className="card">
        <h2 className="text-sm font-bold text-brand-accent uppercase tracking-wider mb-4 pb-3 border-b border-brand-border">
          New Notification
        </h2>
        <form onSubmit={submit} className="space-y-4">
          {/* Topic */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Send To
            </label>
            <select
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Devices subscribed to this topic will receive the push.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Title *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Big Win Alert!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
            <p className="text-[10px] text-slate-500 mt-1 text-right">
              {title.length} / 200
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Message *
            </label>
            <textarea
              className="input min-h-[120px] resize-y"
              placeholder="Type your notification message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              required
            />
            <p className="text-[10px] text-slate-500 mt-1 text-right">
              {body.length} / 2000
            </p>
          </div>

          {/* Live preview */}
          {(title || body) && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Preview</p>
              <div className="bg-slate-900 border border-brand-border rounded-lg p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-slate-900 font-bold">M</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {title || 'Notification Title'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {body || 'Notification message preview...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 border-t border-brand-border">
            <button
              type="submit"
              disabled={sending}
              className="btn-primary w-full disabled:opacity-40"
            >
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="card">
        <h2 className="text-sm font-bold text-brand-accent uppercase tracking-wider mb-4 pb-3 border-b border-brand-border">
          Recent Notifications
        </h2>
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">
            No notifications sent yet
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="bg-slate-800/40 border border-brand-border rounded p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {h.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                      {h.body}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {fmtDate(h.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}