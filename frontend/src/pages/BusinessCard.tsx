import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { BusinessCard as BC } from '../types';
import toast from 'react-hot-toast';

const GROWTH_PLANS = ['growth', 'pro', 'agency'];

export default function BusinessCard() {
  const { activeBrand } = useBrand();
  const { user } = useAuth();
  const [card, setCard] = useState<Partial<BC>>({});
  const [saving, setSaving] = useState(false);

  const hasAccess = user && GROWTH_PLANS.includes(user.plan_tier);

  useEffect(() => {
    if (!activeBrand || !hasAccess) return;
    api.get(`/business-cards/${activeBrand.id}`).then((r) => r.data && setCard(r.data)).catch(() => {});
  }, [activeBrand]);

  const set = (k: string) => (e: any) => setCard((c) => ({ ...c, [k]: e.target.value }));

  const handleSave = async () => {
    if (!activeBrand) return;
    setSaving(true);
    try {
      await api.post(`/business-cards/${activeBrand.id}`, card);
      toast.success('Business card saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (!hasAccess) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-4">💳</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Business Card</h2>
          <p className="text-gray-500 mb-4">Available on Growth plan and above</p>
          <a href="/app/pricing" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">Upgrade Plan</a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Business Card</h1>
      {card.public_slug && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
          Public URL: <a href={`/api/business-cards/public/${card.public_slug}`} target="_blank" className="text-green-700 underline">/api/business-cards/public/{card.public_slug}</a>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {[
          { key: 'title', label: 'Title', placeholder: 'e.g. John Doe' },
          { key: 'subtitle', label: 'Subtitle', placeholder: 'e.g. CEO & Founder' },
          { key: 'phone_1', label: 'Phone 1', placeholder: '+972...' },
          { key: 'phone_2', label: 'Phone 2', placeholder: 'Optional' },
          { key: 'whatsapp_number', label: 'WhatsApp', placeholder: '+972...' },
          { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://...' },
          { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://...' },
          { key: 'address', label: 'Address', placeholder: 'Street, City' },
          { key: 'location_url', label: 'Google Maps URL', placeholder: 'https://maps.google.com/...' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            <input value={(card as any)[key] || ''} onChange={set(key)} placeholder={placeholder} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        ))}
        <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save Business Card'}
        </button>
      </div>
    </div>
  );
}
