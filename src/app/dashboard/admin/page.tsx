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

type SubscriptionLookup = {
  user: { id: string; email: string; username?: string | null };
  active: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
    stripeSubscriptionId: string | null;
  } | null;
  latest: {
    plan_type: string;
    status: string;
    current_period_end: string;
    stripe_subscription_id: string | null;
  } | null;
};

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<QuotaPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [subEmail, setSubEmail] = useState('');
  const [subLookup, setSubLookup] = useState<SubscriptionLookup | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');
  const [subMessage, setSubMessage] = useState('');
  const [periodDays, setPeriodDays] = useState(30);

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

  const lookupSubscription = async () => {
    const email = subEmail.trim();
    if (!email) return;

    setSubLoading(true);
    setSubError('');
    setSubMessage('');
    setSubLookup(null);

    try {
      const res = await fetch(`/api/admin/subscriptions?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setSubLookup(json);
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setSubLoading(false);
    }
  };

  const updateSubscription = async (planType: 'pro' | 'free') => {
    const email = subEmail.trim();
    if (!email) return;

    setSubLoading(true);
    setSubError('');
    setSubMessage('');

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          plan_type: planType,
          period_days: periodDays,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      setSubMessage(json.message);
      await lookupSubscription();
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubLoading(false);
    }
  };

  const pct = data
    ? Math.min(100, Math.round((data.today.totalUnits / data.daily_quota) * 100))
    : 0;

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Admin</h1>
        <p className="text-sm text-gray-400 mt-1">
          Quota monitoring and manual subscription management (backup when Stripe automation fails).
        </p>
      </header>

      {loading && <p className="text-gray-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!error && (
        <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Subscription management</h2>
            <p className="text-xs text-gray-500 mt-1">
              Stripe checkout and webhooks upgrade accounts automatically after payment. Use this
              section as a manual backup if something goes wrong.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={subEmail}
              onChange={(e) => setSubEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={lookupSubscription}
              disabled={subLoading || !subEmail.trim()}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
            >
              Look up
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="period-days" className="text-gray-400">
              Pro period (days)
            </label>
            <input
              id="period-days"
              type="number"
              min={1}
              max={365}
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value) || 30)}
              className="w-20 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-white"
            />
          </div>

          {subError && <p className="text-sm text-red-400">{subError}</p>}
          {subMessage && <p className="text-sm text-green-400">{subMessage}</p>}

          {subLookup && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3 text-sm">
              <p className="text-gray-300">
                <span className="text-gray-500">User:</span> {subLookup.user.email}
                {subLookup.user.username ? ` (${subLookup.user.username})` : ''}
              </p>
              <p className="text-gray-300">
                <span className="text-gray-500">Active plan:</span>{' '}
                {subLookup.active ? (
                  <>
                    <span className="text-blue-300 font-medium">{subLookup.active.plan}</span>
                    {' · expires '}
                    {new Date(subLookup.active.currentPeriodEnd).toLocaleString()}
                  </>
                ) : (
                  <span className="text-gray-400">Free (no active subscription)</span>
                )}
              </p>
              {subLookup.latest?.stripe_subscription_id && (
                <p className="text-xs text-gray-500 break-all">
                  Stripe sub: {subLookup.latest.stripe_subscription_id}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateSubscription('pro')}
                  disabled={subLoading}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Grant Pro
                </button>
                <button
                  type="button"
                  onClick={() => updateSubscription('free')}
                  disabled={subLoading}
                  className="rounded-lg border border-white/20 hover:bg-white/10 disabled:opacity-50 px-3 py-1.5 text-sm text-gray-200"
                >
                  Revoke Pro
                </button>
              </div>
            </div>
          )}
        </section>
      )}

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
