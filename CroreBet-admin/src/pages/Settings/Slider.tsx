import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';

interface Slider {
 id: string;
 title: string | null;
 imageUrl: string;
 linkUrl: string | null;
 sortOrder: number;
 active: boolean;
 createdAt: string;
}

type Tab = 'app' | 'website';

export default function SliderPage() {
 const [tab, setTab] = useState<Tab>('app');
 const [rows, setRows] = useState<Slider[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);
 const [editing, setEditing] = useState<Slider | null>(null);
 const [uploading, setUploading] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const [form, setForm] = useState({
 title: '',
 imageUrl: '',
 linkUrl: '',
 sortOrder: '0',
 active: true,
 });

 const endpoint = tab === 'app' ? '/admin/slider' : '/admin/slider-website';

 const load = async () => {
 setLoading(true);
 try {
 const { data } = await api.get(endpoint);
 setRows(data.data || []);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { load(); }, [tab]);

 const openAdd = () => {
 setEditing(null);
 setForm({ title: '', imageUrl: '', linkUrl: '', sortOrder: '0', active: true });
 setShowModal(true);
 };

 const openEdit = (s: Slider) => {
 setEditing(s);
 setForm({
 title: s.title || '',
 imageUrl: s.imageUrl,
 linkUrl: s.linkUrl || '',
 sortOrder: String(s.sortOrder),
 active: s.active,
 });
 setShowModal(true);
 };

 const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // Validate
 if (!file.type.startsWith('image/')) {
 alert('Please select an image file');
 return;
 }
 if (file.size > 5 * 1024 * 1024) {
 alert('Max file size is 5MB');
 return;
 }

 setUploading(true);
 try {
 const fd = new FormData();
 fd.append('file', file);
 fd.append('folder', 'sliders');

 const { data } = await api.post('/admin/upload', fd, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });

 // Set the returned URL
 setForm((f) => ({ ...f, imageUrl: data.data.url }));
 } catch (err: any) {
 alert(err.response?.data?.message || 'Upload failed');
 } finally {
 setUploading(false);
 // Reset input so same file can be selected again
 if (fileInputRef.current) fileInputRef.current.value = '';
 }
 };

 const save = async () => {
 if (!form.imageUrl.trim()) return alert('Upload an image or paste a URL');
 const payload = {
 title: form.title.trim() || null,
 imageUrl: form.imageUrl.trim(),
 linkUrl: form.linkUrl.trim() || null,
 sortOrder: Number(form.sortOrder) || 0,
 active: form.active,
 };
 try {
 if (editing) {
 await api.put(`${endpoint}/${editing.id}`, payload);
 } else {
 await api.post(endpoint, payload);
 }
 setShowModal(false);
 load();
 } catch (e: any) {
 alert(e.response?.data?.message || 'Save failed');
 }
 };

 const del = async (id: string) => {
 if (!confirm('Delete this slider? This cannot be undone.')) return;
 await api.delete(`${endpoint}/${id}`);
 load();
 };

 const toggleActive = async (s: Slider) => {
 await api.put(`${endpoint}/${s.id}`, { active: !s.active });
 load();
 };

 const move = async (s: Slider, direction: 'up' | 'down') => {
 const newOrder = direction === 'up' ? Math.max(0, s.sortOrder - 1) : s.sortOrder + 1;
 await api.put(`${endpoint}/${s.id}`, { sortOrder: newOrder });
 load();
 };

 return (
 <div>
 <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
 <div>
 <h1 className="text-2xl font-bold">Image Slider</h1>
 <p className="text-xs text-slate-400 mt-1">
 Manage banner images shown on the {tab === 'app' ? 'mobile app' : 'public website'}
 </p>
 </div>
 <button onClick={openAdd} className="btn-primary">
 + Add Slider
 </button>
 </div>

 <div className="flex gap-2 mb-4">
 <button
 onClick={() => setTab('app')}
 className={`px-4 py-2 rounded text-sm font-medium transition ${
 tab === 'app'
 ? 'bg-brand-accent text-slate-900'
 : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
 }`}
 >
 App Slider
 </button>
 <button
 onClick={() => setTab('website')}
 className={`px-4 py-2 rounded text-sm font-medium transition ${
 tab === 'website'
 ? 'bg-brand-accent text-slate-900'
 : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
 }`}
 >
 Website Slider
 </button>
 </div>

 <div className="card">
 {loading ? (
 <div className="flex justify-center py-12">
 <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
 </div>
 ) : rows.length === 0 ? (
 <p className="text-center text-slate-500 py-12">
 No sliders yet. Click "+ Add Slider" to upload one.
 </p>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {rows.map((s) => (
 <div key={s.id} className="bg-slate-800/50 border border-brand-border rounded-lg overflow-hidden">
 <div className="relative aspect-[16/9] bg-slate-900">
 <img
 src={s.imageUrl}
 alt={s.title || 'Slider'}
 className="w-full h-full object-cover"
 onError={(e) => {
 (e.currentTarget as HTMLImageElement).style.display = 'none';
 }}
 />
 {!s.active && (
 <div className="absolute top-2 right-2 bg-red-900/90 text-red-200 text-xs px-2 py-1 rounded">
 Inactive
 </div>
 )}
 <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono">
 #{s.sortOrder}
 </div>
 </div>

 <div className="p-3 space-y-2">
 {s.title && <p className="text-sm font-semibold truncate">{s.title}</p>}
 <p className="text-xs text-slate-400 font-mono truncate" title={s.imageUrl}>
 {s.imageUrl}
 </p>
 {s.linkUrl && (
 <p className="text-xs text-brand-accent truncate" title={s.linkUrl}>
 → {s.linkUrl}
 </p>
 )}

 <div className="flex flex-wrap gap-1 pt-2 border-t border-brand-border">
 <button onClick={() => move(s, 'up')} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded" title="Move up">↑</button>
 <button onClick={() => move(s, 'down')} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded" title="Move down">↓</button>
 <button
 onClick={() => toggleActive(s)}
 className={`text-xs px-2 py-1 rounded ${
 s.active
 ? 'bg-emerald-800 hover:bg-emerald-700 text-emerald-200'
 : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
 }`}
 >
 {s.active ? 'Active' : 'Inactive'}
 </button>
 <button onClick={() => openEdit(s)} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Edit</button>
 <button onClick={() => del(s.id)} className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded">Delete</button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <Modal
 open={showModal}
 onClose={() => setShowModal(false)}
 title={editing ? 'Edit Slider' : 'Add Slider'}
 width="max-w-lg"
 >
 <div className="space-y-4">
 {/* Upload or URL */}
 <div>
 <label className="text-xs text-slate-400 block mb-1">Image *</label>

 {/* Hidden file input */}
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*"
 onChange={handleFileSelect}
 className="hidden"
 />

 {/* Upload button OR drag area */}
 <div className="border-2 border-dashed border-brand-border rounded-lg p-4 text-center hover:border-brand-accent transition">
 {uploading ? (
 <div className="flex flex-col items-center gap-2 py-4">
 <div className="w-8 h-8 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
 <p className="text-xs text-slate-400">Uploading...</p>
 </div>
 ) : form.imageUrl ? (
 <div className="space-y-3">
 <div className="bg-slate-900 rounded overflow-hidden aspect-[16/9]">
 <img src={form.imageUrl} alt="Preview" className="w-full h-full object-contain" />
 </div>
 <div className="flex gap-2 justify-center">
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded"
 >
 Replace Image
 </button>
 <button
 type="button"
 onClick={() => setForm({ ...form, imageUrl: '' })}
 className="text-xs bg-red-900 hover:bg-red-800 px-3 py-1.5 rounded"
 >
 Remove
 </button>
 </div>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="w-full py-8 flex flex-col items-center gap-2"
 >
 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-accent">
 <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
 <polyline points="17 8 12 3 7 8" />
 <line x1="12" y1="3" x2="12" y2="15" />
 </svg>
 <p className="text-sm font-medium text-slate-300">Click to upload image</p>
 <p className="text-xs text-slate-500">JPG, PNG, WEBP, GIF · Max 5MB</p>
 </button>
 )}
 </div>

 {/* OR paste URL */}
 <div className="mt-2">
 <p className="text-[10px] text-slate-500 mb-1 text-center">— or paste a URL —</p>
 <input
 type="text"
 className="input text-xs"
 placeholder="https://example.com/image.jpg"
 value={form.imageUrl}
 onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
 />
 </div>
 </div>

 <div>
 <label className="text-xs text-slate-400 block mb-1">Title (optional)</label>
 <input
 type="text"
 className="input"
 placeholder="e.g. Welcome Banner"
 value={form.title}
 onChange={(e) => setForm({ ...form, title: e.target.value })}
 />
 </div>

 <div>
 <label className="text-xs text-slate-400 block mb-1">Link URL (optional)</label>
 <input
 type="text"
 className="input"
 placeholder="https://magicbossapp.com/charts"
 value={form.linkUrl}
 onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
 />
 <p className="text-[10px] text-slate-500 mt-1">
 Where users go when they tap this slide.
 </p>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs text-slate-400 block mb-1">Sort Order</label>
 <input
 type="number"
 className="input"
 value={form.sortOrder}
 onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
 />
 <p className="text-[10px] text-slate-500 mt-1">Lower = shown first</p>
 </div>
 <div>
 <label className="text-xs text-slate-400 block mb-1">Status</label>
 <select
 className="input"
 value={form.active ? 'yes' : 'no'}
 onChange={(e) => setForm({ ...form, active: e.target.value === 'yes' })}
 >
 <option value="yes">Active</option>
 <option value="no">Inactive</option>
 </select>
 </div>
 </div>

 <div className="flex gap-2 justify-end pt-2 border-t border-brand-border">
 <button
 onClick={() => setShowModal(false)}
 className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm"
 >
 Cancel
 </button>
 <button onClick={save} disabled={uploading} className="btn-primary disabled:opacity-40">
 {editing ? 'Save Changes' : 'Add Slider'}
 </button>
 </div>
 </div>
 </Modal>
 </div>
 );
}