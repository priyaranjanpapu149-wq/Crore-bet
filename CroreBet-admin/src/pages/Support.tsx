import { useEffect, useState } from 'react';
import api from '../api/axios';

type Message = { id: string; sender: string; message: string; createdAt: string };
type Conversation = { id: string; name: string; mobile: string; status: 'pending' | 'solved'; chatMessages: Message[]; _count: { chatMessages: number } };
type Question = { question: string; answer: string };

function AutomaticAnswers({ onClose }: { onClose: () => void }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.get('/support/admin/questions').then(({ data }) => setQuestions(data.data)).catch(() => setError('Could not load automatic answers.')); }, []);
  const update = (index: number, field: keyof Question, value: string) => {
    setQuestions(old => old?.map((item, i) => i === index ? { ...item, [field]: value } : item) ?? null);
    setSaved(false);
  };
  const save = async () => {
    if (!questions || saving) return;
    setSaving(true); setError(''); setSaved(false);
    try { const { data } = await api.put('/support/admin/questions', { questions }); setQuestions(data.data); setSaved(true); }
    catch { setError('Could not save. Please complete each question and answer and try again.'); }
    finally { setSaving(false); }
  };
  return <section className="bg-brand-card border border-brand-border rounded-lg p-4 space-y-4">
    <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-100">Automatic questions and answers</h2><p className="text-xs text-slate-400">Add up to six questions users can choose in Support.</p></div><button className="text-slate-300" onClick={onClose}>Close</button></div>
    {questions?.map((item, i) => <div className="space-y-2 border border-brand-border rounded-lg p-3" key={i}>
      <div className="flex justify-between text-slate-200"><strong>Question {i + 1}</strong><button className="text-red-300" onClick={() => { setQuestions(questions.filter((_, n) => n !== i)); setSaved(false); }}>Remove</button></div>
      <input aria-label={`Question ${i + 1}`} className="input w-full" placeholder="Question" maxLength={200} value={item.question} onChange={e => update(i, 'question', e.target.value)} />
      <textarea aria-label={`Answer ${i + 1}`} className="input w-full" placeholder="Automatic answer" maxLength={1000} value={item.answer} onChange={e => update(i, 'answer', e.target.value)} />
    </div>)}
    {error && <p role="alert" className="text-red-300">{error}</p>}{saved && <p role="status" className="text-emerald-300">Automatic answers saved.</p>}
    {questions && <div className="flex flex-wrap gap-2"><button className="px-3 py-2 bg-slate-700 text-white rounded disabled:opacity-50" disabled={questions.length >= 6} onClick={() => { setQuestions([...questions, { question: '', answer: '' }]); setSaved(false); }}>Add question</button><button className="px-3 py-2 bg-brand-accent text-slate-900 rounded font-semibold disabled:opacity-50" disabled={saving || questions.some(q => !q.question.trim() || !q.answer.trim())} onClick={() => void save()}>{saving ? 'Saving...' : 'Save answers'}</button></div>}
  </section>;
}

export default function Support() {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'solved'>('all');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = async () => {
    try { const { data } = await api.get('/support/admin/conversations'); setRows(data.data); setError(''); }
    catch { setError('Could not load support conversations.'); }
  };
  const open = async (row: Conversation) => {
    try { const { data } = await api.get(`/support/admin/conversations/${row.id}`); setSelected(row); setMessages(data.data); setError(''); await load(); }
    catch { setError('Could not load this conversation.'); }
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10000); return () => window.clearInterval(timer); }, []);
  const send = async () => {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    try { await api.post(`/support/admin/conversations/${selected.id}`, { message: reply.trim() }); setReply(''); await open(selected); }
    catch { setError('Could not send your reply. Please try again.'); }
    finally { setSending(false); }
  };
  const changeStatus = async (status: 'pending' | 'solved') => {
    if (!selected || updatingStatus) return;
    setUpdatingStatus(true);
    try { await api.put(`/support/admin/conversations/${selected.id}/status`, { status }); await load(); }
    catch { setError('Could not update the conversation status. Please try again.'); }
    finally { setUpdatingStatus(false); }
  };
  const selectedStatus = rows.find(row => row.id === selected?.id)?.status ?? selected?.status ?? 'pending';
  const filtered = rows.filter(row => (filter === 'all' || row.status === filter) && `${row.name} ${row.mobile}`.toLowerCase().includes(search.toLowerCase()));
  const unread = rows.reduce((sum, row) => sum + row._count.chatMessages, 0);
  const pending = rows.filter(row => row.status === 'pending').length;
  const solved = rows.filter(row => row.status === 'solved').length;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl md:text-2xl font-bold text-slate-100">Support</h1><p className="text-xs text-slate-500 mt-1">Read and reply to user support messages.</p></div><button className="px-3 py-2 bg-slate-700 text-slate-200 rounded" onClick={() => setShowAnswers(!showAnswers)}>Automatic answers</button></div>
    {showAnswers && <AutomaticAnswers onClose={() => setShowAnswers(false)} />}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><button onClick={() => setFilter('all')} aria-pressed={filter === 'all'} className="text-left bg-brand-card border border-brand-border rounded-lg p-4"><p className="text-xs uppercase text-slate-400">Conversations</p><p className="text-2xl font-bold text-slate-100">{rows.length}</p></button><button onClick={() => setFilter('pending')} aria-pressed={filter === 'pending'} className="text-left bg-amber-900/20 border border-amber-700/40 rounded-lg p-4"><p className="text-xs uppercase text-amber-300">Pending</p><p className="text-2xl font-bold text-amber-300">{pending}</p></button><button onClick={() => setFilter('solved')} aria-pressed={filter === 'solved'} className="text-left bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-4"><p className="text-xs uppercase text-emerald-300">Solved</p><p className="text-2xl font-bold text-emerald-300">{solved}</p></button><div className="bg-brand-card border border-brand-border rounded-lg p-4"><p className="text-xs uppercase text-slate-400">Unread messages</p><p className="text-2xl font-bold text-slate-100">{unread}</p></div></div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <div className="bg-brand-card border border-brand-border rounded-lg p-4"><input className="input w-full" placeholder="Search name or mobile number..." value={search} onChange={e => setSearch(e.target.value)} /></div>
    <div className="bg-brand-card border border-brand-border rounded-lg overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">User</th><th className="p-3">Mobile</th><th className="p-3">Latest message</th><th className="p-3">Status</th><th className="p-3">Unread</th><th className="p-3">Action</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} className="border-t border-brand-border text-slate-200"><td className="p-3">{row.name}</td><td className="p-3">{row.mobile}</td><td className="p-3">{row.chatMessages[0]?.message}</td><td className="p-3">{row.status === 'solved' ? 'Solved' : 'Pending'}</td><td className="p-3">{row._count.chatMessages}</td><td className="p-3"><button className="px-3 py-2 bg-slate-700 rounded" onClick={() => void open(row)}>Open</button></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="p-4 text-slate-400">No conversations found.</p>}</div>
    {selected && <div className="bg-brand-card border border-brand-border rounded-lg p-4 space-y-3"><div className="flex flex-wrap gap-3 justify-between items-center"><h2 className="font-bold text-slate-100">{selected.name} · {selected.mobile} · {selectedStatus === 'solved' ? 'Solved' : 'Pending'}</h2><div className="flex gap-3"><button disabled={updatingStatus} className="px-3 py-2 rounded bg-slate-700 text-white disabled:opacity-50" onClick={() => void changeStatus(selectedStatus === 'pending' ? 'solved' : 'pending')}>{selectedStatus === 'pending' ? 'Mark solved' : 'Reopen'}</button><button onClick={() => setSelected(null)} className="text-slate-400">Close</button></div></div><div className="space-y-3 max-h-96 overflow-y-auto">{messages.map(m => <div key={m.id} className={`p-3 rounded ${m.sender === 'admin' ? 'bg-emerald-900/30 ml-8' : 'bg-slate-800 mr-8'}`}><p className="text-xs text-slate-400">{m.sender === 'admin' ? 'Admin' : selected.name} · {new Date(m.createdAt).toLocaleString()}</p><p className="text-slate-100 whitespace-pre-wrap break-words">{m.message}</p></div>)}</div><textarea className="input w-full" maxLength={4000} placeholder="Write a reply..." value={reply} onChange={e => setReply(e.target.value)} /><button className="px-4 py-2 bg-brand-accent text-slate-900 rounded font-semibold disabled:opacity-50" disabled={sending || !reply.trim()} onClick={() => void send()}>{sending ? 'Sending...' : 'Send reply'}</button></div>}
  </div>;
}
