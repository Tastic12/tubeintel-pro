'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CheckSubscriptionPage() {
  const [subscriptionState, setSubscriptionState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Check various localStorage items
      const subscription = localStorage.getItem('subscription');
      const userId = localStorage.getItem('currentUserId');
      const user = userId ? localStorage.getItem(`user_${userId}`) : null;
      
      setSubscriptionState(JSON.stringify({
        subscription,
        userId,
        user: user ? JSON.parse(user) : null,
        timestamp: new Date().toISOString()
      }, null, 2));
    } catch (err: any) {
      setError(`Error accessing localStorage: ${err.message}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6 dark:text-white">Subscription Test Page</h1>
          
          {error ? (
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded mb-6 text-red-800 dark:text-red-200">
              {error}
            </div>
          ) : null}
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 dark:text-gray-200">Current Subscription State:</h2>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto max-h-96 text-sm dark:text-gray-300">
              {subscriptionState || 'Loading...'}
            </pre>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => {
                localStorage.setItem('subscription', 'free');
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded mr-4"
            >
              Set Free Plan
            </button>
            
            <button
              onClick={() => {
                localStorage.setItem('subscription', 'pro');
                window.location.reload();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Set Pro
            </button>
          </div>
          
          <div className="mt-8 flex flex-col space-y-2">
            <Link href="/subscription" className="text-blue-600 dark:text-blue-400 hover:underline">
              Go to Subscription Page
            </Link>
            <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 