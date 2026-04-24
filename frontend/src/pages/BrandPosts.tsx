import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import api from '../api/client';
import { ScheduledPost } from '../types';

export default function BrandPosts() {
  const { activeBrand } = useBrand();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);

  useEffect(() => {
    if (!activeBrand) return;
    api.get('/scheduled-posts', { data: { client_id: activeBrand.id } }).then((r) => setPosts(r.data)).catch(() => {});
  }, [activeBrand]);

  const statusColor = (s: string) => ({ published: 'text-green-600 bg-green-50', pending: 'text-blue-600 bg-blue-50', failed: 'text-red-600 bg-red-50', cancelled: 'text-gray-500 bg-gray-100' }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Posts</h1>
      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Job #{p.job_id} · {p.publish_type}</p>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(p.scheduled_at).toLocaleString()}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor(p.status)}`}>{p.status}</span>
          </div>
        ))}
        {posts.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No scheduled or published posts yet</p>}
      </div>
    </div>
  );
}
