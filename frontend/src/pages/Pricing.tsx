import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

const PLANS = [
  { tier: 'starter', name: 'Starter', price: 179, text: 50, image: 30, video: 5, landing: 5, brands: 2 },
  { tier: 'growth', name: 'Growth', price: 449, text: 100, image: 70, video: 15, landing: 15, brands: 5, popular: true },
  { tier: 'pro', name: 'Pro', price: 899, text: 200, image: 150, video: 30, landing: 30, brands: 15 },
  { tier: 'agency', name: 'Agency', price: 1499, text: 500, image: 400, video: 80, landing: 80, brands: 50 },
];

export default function Pricing() {
  const { user } = useAuth();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    setLoading(tier);
    try {
      const res = await api.post('/payments/paypal/create-subscription', { plan_tier: tier, plan_interval: interval });
      if (res.data.approval_url) window.location.href = res.data.approval_url;
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create subscription'); }
    finally { setLoading(null); }
  };

  return (
    <div className="p-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h1>
        <p className="text-gray-500 mt-2">All plans include a 7-day free trial</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setInterval('monthly')} className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${interval === 'monthly' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Monthly</button>
          <button onClick={() => setInterval('yearly')} className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${interval === 'yearly' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Yearly (save 20%)</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {PLANS.map((plan) => {
          const price = interval === 'yearly' ? Math.round(plan.price * 12 * 0.8) : plan.price;
          const isCurrent = user?.plan_tier === plan.tier;
          return (
            <div key={plan.tier} className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${plan.popular ? 'border-indigo-500' : 'border-gray-200'}`}>
              {plan.popular && <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">Most Popular</span>}
              <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold text-gray-900">₪{price.toLocaleString()}</span>
                <span className="text-gray-400 text-sm">/{interval === 'yearly' ? 'year' : 'month'}</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 flex-1 mb-6">
                <li>🖼️ {plan.image} image credits/mo</li>
                <li>🎬 {plan.video} video credits/mo</li>
                <li>✍️ {plan.text} text credits/mo</li>
                <li>🌐 {plan.landing} landing pages/mo</li>
                <li>🏢 {plan.brands} brand{plan.brands > 1 ? 's' : ''}</li>
              </ul>
              <button
                onClick={() => handleSubscribe(plan.tier)}
                disabled={isCurrent || loading === plan.tier}
                className={`w-full font-semibold py-3 rounded-xl transition-colors text-sm ${
                  isCurrent ? 'bg-green-100 text-green-700 cursor-default' :
                  plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-60`}
              >
                {isCurrent ? '✓ Current Plan' : loading === plan.tier ? 'Redirecting…' : 'Get Started'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
