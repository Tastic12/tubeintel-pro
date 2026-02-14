'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaCheckCircle } from 'react-icons/fa';
import Link from 'next/link';
import { secureAuth } from '@/lib/secure-auth';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState('');
  const { refreshSubscription } = useSubscriptionContext();
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setError('Invalid session');
      setIsLoading(false);
      return;
    }
    
    // First check if user is authenticated then verify the payment
    const verifyPayment = async () => {
      try {
        // Check if the user is authenticated
        const isUserAuthenticated = await secureAuth.isAuthenticated();
        
        if (!isUserAuthenticated) {
          router.push(`/login?redirectTo=${encodeURIComponent(`/subscription/success?session_id=${sessionId}`)}`);
          return;
        }
        
        // Verify the payment with our API
        const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
        const data = await response.json();
        
        if (!response.ok) {
          if (data.redirectUrl) {
            // If we need to redirect (e.g., for authentication)
            router.push(data.redirectUrl);
            return;
          }
          
          throw new Error(data.error || 'Payment verification failed');
        }
        
        // Store the subscription data from the API response
        setSubscription(data.subscription);
        
        // Immediately refresh the subscription data in the context
        // This ensures the UI throughout the app shows the updated subscription
        await refreshSubscription();
        
        setIsLoading(false);
        
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.message || 'Failed to verify payment');
        setIsLoading(false);
      }
    };
    
    verifyPayment();
  }, [router, searchParams, refreshSubscription]);
  
  // Redirect to dashboard after 5 seconds
  useEffect(() => {
    if (subscription && !isLoading) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [subscription, isLoading, router]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-4">Processing Your Payment</h2>
          <p className="text-gray-600">
            Please wait while we verify your payment...
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="bg-red-100 text-red-500 p-3 rounded-full inline-flex mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Payment Verification Failed</h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <div className="flex flex-col space-y-3">
            <Link href="/pricing" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition">
              Return to Pricing
            </Link>
            <Link href="/contact" className="w-full border border-gray-300 hover:bg-gray-50 py-2 px-4 rounded transition">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="bg-green-100 text-green-500 p-3 rounded-full inline-flex mb-4">
          <FaCheckCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for subscribing to {subscription?.plan_type === 'pro' ? 'Pro' : 'Pro Plus'}. Your account has been upgraded.
        </p>
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">Plan:</span>
            <span className="font-medium">{subscription?.plan_type === 'pro' ? 'Pro' : 'Pro Plus'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Next billing date:</span>
            <span className="font-medium">
              {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          You'll be redirected to the dashboard in a few seconds...
        </p>
        <Link href="/dashboard" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition inline-block">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
} 