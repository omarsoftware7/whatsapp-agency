import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';

export default function AdminBrands() {
  const [brands, setBrands] = useState<any[]>([]);
  useEffect(() => { adminApi.brands.list().then(setBrands); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Brands ({brands.length})</h1>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Brand</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Owners</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{b.business_name}</td>
                <td className="px-4 py-3 text-gray-500">{b.brandProfile?.category || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{b.userLinks?.map((l: any) => l.webUser?.email).join(', ')}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(b.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
