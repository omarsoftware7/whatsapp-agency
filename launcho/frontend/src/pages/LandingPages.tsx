import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import api from '../api/client';
import { LandingPage } from '../types';
import toast from 'react-hot-toast';

export default function LandingPages() {
  const { activeBrand } = useBrand();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!activeBrand) return;
    const res = await api.get('/landing-pages', { params: { client_id: activeBrand.id } });
    setPages(res.data);
  };

  useEffect(() => { load(); }, [activeBrand]);

  const handleCreate = async () => {
    if (!activeBrand || !prompt.trim()) return;
    setCreating(true);
    try {
      await api.post('/landing-pages', { client_id: activeBrand.id, user_prompt: prompt });
      setPrompt('');
      toast.success('Landing page generating…');
      load();
    } catch { toast.error('Failed to create landing page'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    await api.post(`/landing-pages/${id}/delete`);
    setPages((p) => p.filter((pg) => pg.id !== id));
  };

  const statusColor = (s: string) => ({ generating: 'text-yellow-600', published: 'text-green-600', failed: 'text-red-600' }[s] || 'text-gray-500');

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Landing Pages</h1>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Create New Landing Page</h2>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Describe the landing page you want to create…" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" />
        <button onClick={handleCreate} disabled={creating || !prompt.trim()} className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {creating ? 'Generating…' : '✨ Generate Landing Page'}
        </button>
      </div>
      <div className="space-y-3">
        {pages.map((pg) => (
          <div key={pg.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{pg.title || pg.user_prompt?.slice(0, 60)}</p>
              <p className={`text-sm mt-0.5 ${statusColor(pg.status)}`}>{pg.status}</p>
            </div>
            <div className="flex gap-2">
              {pg.public_slug && <a href={`/api/public/landing/${pg.public_slug}`} target="_blank" className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-medium">View</a>}
              <button onClick={() => handleDelete(pg.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg">Delete</button>
            </div>
          </div>
        ))}
        {pages.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No landing pages yet</p>}
      </div>
    </div>
  );
}
