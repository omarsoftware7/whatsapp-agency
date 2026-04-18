import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';

export default function AdminJobs() {
  const [data, setData] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => { adminApi.jobs.list(search).then(setData); }, [search]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Jobs</h1>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Brand</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Stage</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((j) => (
              <tr key={j.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">#{j.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{j.client?.business_name}</td>
                <td className="px-4 py-3 text-gray-600">{j.job_type}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${j.current_stage === 'completed' ? 'bg-green-100 text-green-700' : j.current_stage === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{j.current_stage}</span></td>
                <td className="px-4 py-3 text-gray-400">{new Date(j.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
