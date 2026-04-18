import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { adminApi.users.list().then(setUsers); }, []);

  const filtered = users.filter((u) =>
    !search || u.email?.includes(search) || u.first_name?.includes(search)
  );

  const handleToggleActive = async (user: any) => {
    try {
      await adminApi.users.update(user.id, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Revenue</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-4 py-3"><span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">{u.plan_tier}</span></td>
                <td className="px-4 py-3"><span className={`text-xs font-medium ${u.subscription_status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{u.subscription_status}</span></td>
                <td className="px-4 py-3 text-gray-600">₪{u.total_revenue?.toLocaleString() || '0'}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleActive(u)} className={`text-xs px-2 py-1 rounded-lg ${u.is_active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
