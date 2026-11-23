import { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../../api/axios';

export default function NoticeEditor() {
 const [content, setContent] = useState('');
 const [original, setOriginal] = useState('');
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [updatedAt, setUpdatedAt] = useState<string | null>(null);
 const [preview, setPreview] = useState(false);

 const load = async () => {
 setLoading(true);
 try {
 const { data } = await api.get('/admin/site-notice');
 setContent(data.data.content || '');
 setOriginal(data.data.content || '');
 setUpdatedAt(data.data.updatedAt);
 } catch (e: any) {
 setError(e.response?.data?.message || 'Failed to load');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { load(); }, []);

 const save = async () => {
 setError(''); setSuccess('');
 if (content.length > 20000) return setError('Content too long (max 20k)');
 setSaving(true);
 try {
 const { data } = await api.post('/admin/site-notice', { content });
 setOriginal(data.data.content);
 setUpdatedAt(data.data.updatedAt);
 setSuccess('Notice saved successfully');
 setTimeout(() => setSuccess(''), 3000);
 } catch (e: any) {
 setError(e.response?.data?.message || 'Save failed');
 } finally {
 setSaving(false);
 }
 };

 const isDirty = content !== original;

 if (loading) {
 return (
 <div className="flex justify-center py-20">
 <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
 </div>
 );
 }

 return (
 <div className="max-w-5xl mx-auto space-y-4">
 {/* Header */}
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-bold">Site Notice</h1>
 <p className="text-xs text-slate-400 mt-1">
 Shown at the top of the website and app to all users
 </p>
 </div>
 <div className="flex items-center gap-2">
 {updatedAt && (
 <span className="text-[10px] text-slate-500">
 Last saved: {new Date(updatedAt).toLocaleString('en-GB')}
 </span>
 )}
 <button
 onClick={() => setPreview(!preview)}
 className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded"
 >
 {preview ? 'Edit' : 'Preview'}
 </button>
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
 {success}
 </div>
 )}
 {isDirty && (
 <div className="bg-amber-900/20 border border-amber-700/50 rounded p-3 text-amber-300 text-sm">
 ⚠ You have unsaved changes
 </div>
 )}

 {/* Editor / Preview */}
 <div className="card p-0 overflow-hidden">
 <div className="px-4 py-2 bg-slate-800/50 border-b border-brand-border text-xs text-slate-400 uppercase tracking-wider">
 {preview ? 'Preview' : 'Editor'}
 </div>

 {preview ? (
 <div className="p-6 min-h-[300px]">
 {content ? (
 <div
 className="prose prose-invert max-w-none text-slate-200"
 dangerouslySetInnerHTML={{ __html: content }}
 />
 ) : (
 <p className="text-slate-500 italic">Nothing to preview — editor is empty.</p>
 )}
 </div>
 ) : (
 <div className="notice-quill-editor">
 <ReactQuill
 theme="snow"
 value={content}
 onChange={setContent}
 placeholder="Type the site-wide notice here..."
 modules={{
 toolbar: [
 [{ header: [1, 2, 3, false] }],
 ['bold', 'italic', 'underline', 'strike'],
 [{ color: [] }, { background: [] }],
 [{ list: 'ordered' }, { list: 'bullet' }],
 [{ align: [] }],
 ['link'],
 ['clean'],
 ],
 }}
 style={{ minHeight: 300 }}
 />
 </div>
 )}
 </div>

 {/* Actions */}
 <div className="card flex flex-wrap items-center justify-between gap-3">
 <div className="text-xs text-slate-500">
 {content.length.toLocaleString()} / 20,000 characters
 </div>
 <div className="flex gap-2">
 <button
 onClick={load}
 disabled={loading || saving}
 className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm disabled:opacity-40"
 >
 Reset
 </button>
 <button
 onClick={save}
 disabled={saving || !isDirty}
 className="btn-primary disabled:opacity-40"
 >
 {saving ? 'Saving...' : isDirty ? 'Save Notice' : 'Saved'}
 </button>
 </div>
 </div>

 {/* Info */}
 <div className="card text-xs text-slate-400 space-y-1">
 <p>💡 <strong className="text-slate-300">Formatting:</strong> Use the toolbar for bold, headers, lists, links.</p>
 <p>🌐 <strong className="text-slate-300">Where it shows:</strong> Top banner of the website and mobile app.</p>
 <p>🔒 <strong className="text-slate-300">HTML sanitized:</strong> Only safe tags are stored.</p>
 </div>
 </div>
 );
}