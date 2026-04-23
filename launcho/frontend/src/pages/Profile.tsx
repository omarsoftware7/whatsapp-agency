import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });

  const handleUpdate = async () => {
    try {
      await api.post('/profile/update', form);
      await refresh();
      toast.success('Profile updated');
    } catch { toast.error('Failed to update'); }
  };

  const handlePassword = async () => {
    try {
      await api.post('/profile/change-password', pwForm);
      setPwForm({ current_password: '', new_password: '' });
      toast.success('Password changed');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const PLAN_CREDITS: Record<string, Record<string, number>> = {
    trial:   { text: 10,  image: 10,  video: 2,  landing: 2  },
    starter: { text: 50,  image: 30,  video: 5,  landing: 5  },
    growth:  { text: 100, image: 70,  video: 15, landing: 15 },
    pro:     { text: 200, image: 150, video: 30, landing: 30 },
    agency:  { text: 500, image: 400, video: 80, landing: 80 },
  };
  const limits = PLAN_CREDITS[user?.plan_tier || 'trial'] || {};

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Plan badge */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-indigo-600 font-semibold uppercase">{user?.plan_tier} Plan</p>
          <p className="text-xs text-indigo-500 mt-0.5">{user?.subscription_status}</p>
        </div>
        <a href="/app/pricing" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors">Upgrade</a>
      </div>

      {/* Credits */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Credits Remaining</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Image', key: 'image_credits_remaining', limitKey: 'image' },
            { label: 'Video', key: 'video_credits_remaining', limitKey: 'video' },
            { label: 'Text', key: 'text_credits_remaining', limitKey: 'text' },
            { label: 'Landing', key: 'landing_credits_remaining', limitKey: 'landing' },
          ].map(({ label, key, limitKey }) => {
            const current = (user as any)?.[key] || 0;
            const max = limits[limitKey] || 1;
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold">{current}/{max}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (current / max) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Update profile */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">Account Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">First name</label>
            <input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Last name</label>
            <input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <p className="text-sm text-gray-400">Email: {user?.email}</p>
        <button onClick={handleUpdate} className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">Save Changes</button>
      </div>

      {/* Change password */}
      {!(user as any)?.google_id && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Change Password</h2>
          <input type="password" placeholder="Current password" value={pwForm.current_password} onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="password" placeholder="New password (min 8 chars)" value={pwForm.new_password} onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={handlePassword} className="bg-gray-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-900 transition-colors">Update Password</button>
        </div>
      )}
    </div>
  );
}
