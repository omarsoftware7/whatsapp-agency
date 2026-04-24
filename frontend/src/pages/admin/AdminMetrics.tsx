import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { AdminMetrics } from '../../types';

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => { adminApi.metrics(period).then(setMetrics); }, [period]);

  if (!metrics) return <div className="p-6 text-gray-400">Loading metrics…</div>;

  const stat = (label: string, value: string | number, sub?: string) => (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <select value={period} onChange={(e) => setPeriod(parseInt(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stat('MRR', `₪${metrics.mrr.toLocaleString()}`)}
        {stat('ARR', `₪${metrics.arr.toLocaleString()}`)}
        {stat('ARPU', `₪${metrics.arpu.toFixed(0)}`)}
        {stat('Active Users', metrics.active_users)}
        {stat('Trial Users', metrics.trial_users)}
        {stat('Total Users', metrics.total_users)}
        {stat('Total Jobs', metrics.total_jobs)}
        {stat('Published', metrics.published_jobs, `${metrics.publishing_rate}% publish rate`)}
        {stat('Referrals', metrics.total_referrals)}
      </div>
    </div>
  );
}
