'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCrown, FaStar, FaCheck, FaLock, FaUser } from 'react-icons/fa';
import Link from 'next/link';
import { PRODUCTS } from '@/utils/stripe';

// Debug logs for component lifecycle
console.log('Subscription page module loaded');

// Subscription types
type SubscriptionTier = 'free' | 'pro';

// Feature definitions for each plan
interface Feature {
  name: string;
  included: {
    free: boolean;
    pro: boolean;
  };
}

const features: Feature[] = [
  {
    name: 'Basic Analytics Dashboard',
    included: { free: true, pro: true }
  },
  {
    name: 'Track up to 5 channels',
    included: { free: true, pro: true }
  },
  {
    name: 'Track up to 10 videos',
    included: { free: true, pro: true }
  },
  {
    name: 'Basic Insights',
    included: { free: true, pro: true }
  },
  {
    name: 'Track unlimited channels',
    included: { free: false, pro: true }
  },
  {
    name: 'Track unlimited videos',
    included: { free: false, pro: true }
  },
  {
    name: 'Priority Support',
    included: { free: false, pro: true }
  }
];

const proFeatures = [
  {
    name: 'Unlimited Channel Tracking',
    description: 'Track unlimited channels and get detailed analytics'
  },
  {
    name: 'Unlimited Video Collections',
    description: 'Save and organize unlimited videos for analysis and research'
  },
  {
    name: 'Priority Support',
    description: 'Get faster response times and priority assistance'
  }
];

export default function SubscriptionPage() {
  console.log('Subscription page component rendered');
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [isStripeAvailable, setIsStripeAvailable] = useState<boolean | null>(null);
  
  // Check for cancel/success status in URL and initialize component
  useEffect(() => {
    // Log environment variables (not the values, just whether they exist)
    console.log('Stripe public key exists:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
    
    // Simplified init function that prevents redirect loops
    const initSubscriptionPage = async () => {
      try {
        console.log('Initializing subscription page...');
        
        // Get current user's subscription from localStorage as a starting point
        const savedPlan = localStorage.getItem('subscription') as SubscriptionTier || 'free';
        setCurrentPlan(savedPlan);
        
        // Always enable Stripe if the key exists
        setIsStripeAvailable(!!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
        
        // Try to get current auth and subscription info without causing redirects
        try {
          const authResponse = await fetch('/api/auth/check', {
            credentials: 'include'
          });
          
          if (authResponse.ok) {
            const authResult = await authResponse.json();
            console.log('Auth check successful:', authResult);
            
            // Only check subscription if user is authenticated
            if (authResult.authenticated) {
              try {
                const subscriptionResponse = await fetch('/api/subscription/check', {
                  credentials: 'include'
                });
                
                if (subscriptionResponse.ok) {
                  const result = await subscriptionResponse.json();
                  console.log('Subscription status:', result);
                  
                  if (result.success && result.subscription) {
                    // Update to server-provided data
                    setCurrentPlan(result.subscription.plan_type || 'free');
                  }
                }
              } catch (subscriptionError) {
                console.error('Error checking subscription:', subscriptionError);
              }
            }
          } else {
            console.log('User not authenticated, but not redirecting to prevent loops');
            // We don't redirect here - we'll check auth again when user clicks subscribe
          }
        } catch (error) {
          console.error('Error checking auth/subscription:', error);
        }
      } catch (error) {
        console.error('Error initializing subscription page:', error);
      }
    };
    
    // Safely check URL parameters
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.get('canceled')) {
        setMessage({
          type: 'info',
          text: 'Payment canceled. You can try again when you\'re ready.'
        });
      } else if (urlParams.get('success')) {
        setMessage({
          type: 'success',
          text: 'Payment successful! Your subscription is now active.'
        });
      }
      
      // Start the page initialization without redirects
      initSubscriptionPage();
      
    } catch (error) {
      console.error('Error in subscription page initialization:', error);
    }
  }, []);
  
  // Handle subscription change
  const handleSubscribe = async (planType: 'pro') => {
    if (planType === currentPlan) {
      setMessage({
        type: 'info',
        text: `You're already subscribed to ${planType === 'pro' ? 'Pro' : 'Pro'}`
      });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);  // Clear any previous messages
    console.log('Starting subscription process for tier:', planType);
    
    try {
      // First check if user is logged in
      const authResponse = await fetch('/api/auth/check', {
        credentials: 'include'
      });
      
      // If not authenticated, redirect to login
      if (!authResponse.ok) {
        console.log('User not authenticated, redirecting to login...');
        
        // Store intended subscription in localStorage for after login
        if (typeof window !== 'undefined') {
          localStorage.setItem('intended_subscription', planType);
        }
        
        // Show message before redirecting
        setMessage({
          type: 'info',
          text: 'Please log in to continue with your subscription'
        });
        
        // Short delay before redirect for user to see message
        setTimeout(() => {
          router.push(`/login?redirectTo=${encodeURIComponent('/subscription')}`);
        }, 1500);
        
        setIsLoading(false);
        return;
      }
      
      // For Stripe integration - only import when needed
      const { getStripe } = await import('@/utils/stripe');
      
      // Since we only have Pro plan now, use Pro price ID
      const priceId = PRODUCTS.PRO.priceId;
      
      console.log('Using price ID:', priceId);
      
      // Call our checkout API endpoint
      console.log('Calling checkout API endpoint...');
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          priceId: PRODUCTS.PRO.priceId,
          successUrl: `${window.location.origin}/subscription?success=true`,
          cancelUrl: `${window.location.origin}/subscription?canceled=true`,
        }),
      });
      
      console.log('Checkout API response status:', response.status);
      
      const result = await response.json();
      console.log('Checkout API response:', result);
      
      // If user needs to authenticate, handle that error
      if (response.status === 401 && result.redirectUrl) {
        console.log('Authentication required. Redirecting to login page...');
        router.push(result.redirectUrl);
        return;
      }
      
      // Handle other errors
      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }
      
      // Redirect to Stripe Checkout
      if (result.url) {
        console.log('Redirecting to:', result.url);
        window.location.href = result.url;
        return;
      }
      
    } catch (error) {
      console.error('Subscription error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to start subscription process. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderCheckmark = (included: boolean) => {
    if (included) {
      return <FaCheck className="text-green-500" />;
    }
    return <FaLock className="text-gray-400" />;
  };
  
  console.log('Rendering subscription page UI');
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold dark:text-white mb-3">
            Upgrade Your YouTube Analytics Experience
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Choose the plan that's right for you and take your YouTube channel to the next level
          </p>
        </div>
        
        {message && (
          <div className={`max-w-xl mx-auto mb-8 p-4 rounded-full ${
            message.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
              : message.type === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
          }`}>
            <p>{message.text}</p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaUser className="text-gray-500" /> Free
              </h2>
              <p className="mt-1 text-gray-600 dark:text-gray-400">Perfect for getting started</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">/month</span>
              </div>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <FaCheck className="text-green-500" />
                  </div>
                  <span className="text-sm dark:text-gray-300">
                    Basic Analytics Dashboard
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <FaCheck className="text-green-500" />
                  </div>
                  <span className="text-sm dark:text-gray-300">
                    Track up to 5 channels
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <FaCheck className="text-green-500" />
                  </div>
                  <span className="text-sm dark:text-gray-300">
                    Track up to 10 videos
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <FaCheck className="text-green-500" />
                  </div>
                  <span className="text-sm dark:text-gray-300">
                    Basic Insights
                  </span>
                </li>
              </ul>
              
              <div className="mt-6">
                <div className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium rounded-lg text-center">
                  Current Plan
                </div>
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 border-blue-500 relative">
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <FaCrown className="text-blue-500" /> Pro
                </h2>
                {currentPlan === 'pro' && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                    Current Plan
                  </span>
                )}
              </div>
              <p className="mt-1 text-gray-600 dark:text-gray-400">For serious creators</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">$29.99</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">/month</span>
              </div>
            </div>
            
            <div className="p-6">
              {/* Everything in Free tier plus header */}
              <div className="mb-4">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
                  Everything in Free tier plus:
                </p>
              </div>
              
              {/* Pro specific features only */}
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <FaCheck className="text-green-500" />
                  </div>
                  <span className="text-sm dark:text-gray-300">
                    Track unlimited channels
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <FaCheck className="text-green-500" />
                  </div>
                  <span className="text-sm dark:text-gray-300">
                    Track unlimited videos
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <FaCheck className="text-green-500" />
                  </div>
                  <span className="text-sm dark:text-gray-300">
                    Priority Support
                  </span>
                </li>
              </ul>
              
              <div className="mt-6">
                {currentPlan === 'pro' ? (
                  <div className="w-full py-2 px-4 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium rounded-lg text-center">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe('pro')}
                    disabled={isLoading}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {isLoading ? 'Processing...' : 'Upgrade to Pro'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            ← Back to Dashboard
          </Link>
          
          {/* Demo mode indicator - only visible if demo=true in URL */}
          {new URLSearchParams(window?.location?.search || '').get('demo') === 'true' && (
            <div className="mt-4 text-sm text-yellow-600 dark:text-yellow-400">
              Demo Mode Enabled - No authentication required
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 