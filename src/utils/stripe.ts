import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js';

// Debug the environment variables
console.log('Client-side: NEXT_PUBLIC_STRIPE_PUBLIC_KEY exists:', 
  typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

// Cache the Stripe promise so we don't recreate it on each request
let stripePromise: Promise<StripeJS | null> | null = null;

// Load the Stripe library with your publishable key only when needed
export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
    if (!key) {
      console.warn('Missing Stripe public key. Payment features will be disabled.');
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// For server-side Stripe operations
import Stripe from 'stripe';

// Debug server-side env variables
if (typeof window === 'undefined') {
  console.log('Server-side: STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
}

// Create a server-side instance only when in a server context
let serverStripe: Stripe | null = null;

export const getServerStripe = () => {
  if (typeof window === 'undefined') {
    if (!serverStripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        console.warn('Missing Stripe secret key. Server-side payment features will be disabled.');
        return null;
      }
      
      try {
        // Create Stripe instance with default API version
        serverStripe = new Stripe(key, {
          typescript: true,
        });
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
        return null;
      }
    }
    return serverStripe;
  }
  return null;
};

// Export for webhook usage
export const stripe = getServerStripe();

// Define product and price IDs
export const PRODUCTS = {
  PRO: {
    name: 'Pro',
    id: 'prod_SK8lQHJNjndiEO', // Your Stripe product ID
    priceId: 'price_1RY4QjC02Im4s7TPr2nMPptU', // Your Stripe price ID
    features: [
      'Track unlimited competitors',
      'Track unlimited videos',
      'Advanced Trend Analysis',
      'Priority Support',
      'And all Free features'
    ]
  }
}; 