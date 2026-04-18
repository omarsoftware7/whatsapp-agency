import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import api from '../api/client';
import { ContentPlan } from '../types';
import toast from 'react-hot-toast';

export default function ContentPlanPage() {
  const { activeBrand } = useBrand();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!activeBrand) return;
    const res = await api.get('/content-plans', { params: { client_id: activeBrand.id } });
    setPlan(res.data);
  };

  useEffect(() => { load(); }, [activeBrand]);

  const handleGenerate = async () => {
    if (!activeBrand) return;
    setGenerating(true);
    try {
      const res = await api.post('/content-plans/generate', { client_id: activeBrand.id, mode: prompt ? 'manual' : 'auto', user_prompt: prompt });
      setPlan(res.data);
      toast.success('Content plan generated! (Cost: 4 text credits)');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setGenerating(false); }
  };

  const handleApprove = async (itemId: number) => {
    await api.post(`/content-plans/items/${itemId}/approve`, { item_id: itemId });
    load();
  };

  const handleCreateJob = async (itemId: number) => {
    await api.post(`/content-plans/items/${itemId}/create-job`, { item_id: itemId, image_size: 'post', language: 'en' });
    toast.success('Job created!');
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Content Plan</h1>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="Optional: describe the theme or campaign focus…" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" />
        <button onClick={handleGenerate} disabled={generating} className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {generating ? 'Generating…' : '✨ Generate Plan (4 text credits)'}
        </button>
      </div>
      {plan && (
        <div className="space-y-3">
          {plan.items?.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.idea_text}</p>
                  <span className="text-xs text-indigo-600 mt-1 inline-block">{item.job_type}</span>
                </div>
                <div className="flex gap-2 ml-4">
                  {item.status === 'draft' && <button onClick={() => handleApprove(item.id)} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium">Approve</button>}
                  {item.status === 'approved' && <button onClick={() => handleCreateJob(item.id)} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium">Create Job</button>}
                  {item.status === 'created' && <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg">Job created</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
