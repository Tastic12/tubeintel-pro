'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type QuotaPayload = {
  daily_quota: number;
  today: {
    totalUnits: number;
    callCount: number;
    byEndpoint: Record<string, number>;
    remaining: number;
  };
  last_7_days: {
    totalUnits: number;
    callCount: number;
    byEndpoint: Record<string, number>;
  };
};

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<QuotaPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError('You must be logged in to view admin data.');
      setLoading(false);
      return;
    }

    fetch('/api/admin/quota')
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 403) {
          setError('Admin access only. Add your email to ADMIN_EMAILS in .env.local and Vercel.');
          return;
        }
        if (!res.ok) throw new Error(json.error || 'Failed to load quota');
        setData(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const pct = data
    ? Math.min(100, Math.round((data.today.totalUnits / data.daily_quota) * 100))
    : 0;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Admin</h1>
        <p className="text-sm text-gray-400 mt-1">
          YouTube API quota tracking (Google resets quota at midnight Pacific Time).
        </p>
      </header>

      {loading && <p className="text-gray-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {data && (
        <>
          <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Today (UTC)</h2>
            <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-sm text-gray-200">
              {data.today.totalUnits.toLocaleString()} / {data.daily_quota.toLocaleString()}{' '}
              units estimated · {data.today.remaining.toLocaleString()} remaining
            </p>
            <p className="text-xs text-gray-500">
              {data.today.callCount} logged API operations
            </p>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
            <h2 className="text-sm font-semibold text-white mb-3">By endpoint (today)</h2>
            {Object.keys(data.today.byEndpoint).length === 0 ? (
              <p className="text-xs text-gray-500">No usage logged yet today.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {Object.entries(data.today.byEndpoint)
                  .sort((a, b) => b[1] - a[1])
                  .map(([endpoint, units]) => (
                    <li key={endpoint} className="flex justify-between gap-4">
                      <span className="text-gray-400 truncate">{endpoint}</span>
                      <span className="font-medium text-gray-200">{units} units</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
            <h2 className="text-sm font-semibold text-white mb-2">Last 7 days</h2>
            <p className="text-sm text-gray-300">
              {data.last_7_days.totalUnits.toLocaleString()} units across{' '}
              {data.last_7_days.callCount.toLocaleString()} calls
            </p>
          </section>
        </>
      )}
    </div>
  );
}
