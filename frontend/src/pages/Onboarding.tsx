import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { brandsApi } from '../api/brands';
import { useBrand } from '../contexts/BrandContext';
import toast from 'react-hot-toast';

const CATEGORIES = ['Restaurant','Retail','Fashion','Beauty','Health','Technology','Real Estate','Education','Finance','Travel','Other'];
const COUNTRIES = ['Israel','Saudi Arabia','UAE','Egypt','Jordan','Lebanon','Kuwait','Bahrain','Qatar','Oman','Other'];
const PRICE_RANGES = [{ value: 'low', label: 'Budget' }, { value: 'med', label: 'Mid-range' }, { value: 'high', label: 'Premium' }];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refresh } = useBrand();
  const [form, setForm] = useState({
    business_name: '', category: '', description: '', website: '',
    instagram_handle: '', facebook_page_url: '', instagram_page_url: '',
    location: '', business_phone: '', price_range: 'med', country: 'Israel',
    target_audience: '', language: 'en',
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogo(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const brand = await brandsApi.create(form);
      if (logo) {
        await brandsApi.uploadLogo(brand.id, logo);
      }
      await refresh();
      navigate('/app');
      toast.success('Brand created successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create brand');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Set up your brand</h1>
          <p className="text-gray-500 mt-2">Tell us about your business so we can generate better content</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {logoPreview ? <img src={logoPreview} className="h-full w-full object-cover" /> : <span className="text-2xl">🖼️</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm text-gray-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input required value={form.business_name} onChange={set('business_name')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select required value={form.category} onChange={set('category')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select value={form.country} onChange={set('country')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Description *</label>
              <textarea required rows={3} value={form.description} onChange={set('description')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="What does your business do?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={form.website} onChange={set('website')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
              <input value={form.business_phone} onChange={set('business_phone')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <select value={form.price_range} onChange={set('price_range')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {PRICE_RANGES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Language</label>
              <select value={form.language} onChange={set('language')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="he">Hebrew</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Page URL</label>
              <input value={form.facebook_page_url} onChange={set('facebook_page_url')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://facebook.com/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
              <input value={form.instagram_page_url} onChange={set('instagram_page_url')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://instagram.com/..." />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <input value={form.target_audience} onChange={set('target_audience')} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Women aged 25-45 interested in fashion" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3.5 transition-colors disabled:opacity-60">
            {loading ? 'Setting up your brand…' : 'Launch My Brand →'}
          </button>
        </form>
      </div>
    </div>
  );
}
