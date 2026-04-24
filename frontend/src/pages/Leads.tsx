import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import api from '../api/client';
import { Lead } from '../types';
import toast from 'react-hot-toast';

export default function Leads() {
  const { activeBrand } = useBrand();
  const [leads, setLeads] = useState<Lead[]>([]);

  const load = async () => {
    if (!activeBrand) return;
    const res = await api.get('/leads', { params: { client_id: activeBrand.id } });
    setLeads(res.data);
  };

  useEffect(() => { load(); }, [activeBrand]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBrand) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('client_id', String(activeBrand.id));
    try {
      const res = await api.post('/leads/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${res.data.imported} leads`);
      load();
    } catch { toast.error('Import failed'); }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <label className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors">
          📥 Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">{l.name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{l.email || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{l.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(l.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No leads yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
