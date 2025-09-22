import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/utils/stripe';
import { createClient } from '@/utils/supabase/server';
import { PRODUCTS } from '@/utils/stripe';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Get the request data
    const { priceId, planType } = await req.json();
    
    // Debug info
    console.log('Checkout request received:', { priceId, planType });
    console.log('Server Stripe key exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('Using product ID:', PRODUCTS.PRO.id);
    
    // Validate the request
    if (!priceId || !planType) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    if (planType !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    // Check if Stripe is configured
    const stripe = getServerStripe();
    
    if (!stripe) {
      console.log('Stripe not configured, cannot process payment');
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Get the user's authentication status - AUTHENTICATION IS REQUIRED
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Default to no authentication
    let userId = null;
    let email = null;
    let authMethod = "none";
    
    // Check for session from Supabase client
    if (session && session.user) {
      userId = session.user.id;
      email = session.user.email || '';
      authMethod = "supabase_session";
    } 
    // Fallback: Try to extract user directly from cookie if Supabase session fails
    else {
      const cookieStore = cookies();
      const authCookie = cookieStore.get('sb-auth-token');
      
      if (authCookie) {
        try {
          const authData = JSON.parse(authCookie.value);
          if (authData && authData.user) {
            userId = authData.user.id;
            email = authData.user.email || '';
            authMethod = "cookie_extraction";
            console.log('User extracted directly from cookie for checkout');
          }
        } catch (parseError) {
          console.error('Failed to parse auth cookie:', parseError);
        }
      }
    }
    
    // Debug auth information
    console.log('Auth check result:', {
      method: authMethod,
      hasUserId: !!userId,
      hasEmail: !!email,
      error: sessionError ? sessionError.message : null
    });
    
    // STRICT CHECK: If user is not authenticated, return error and redirect to login
    if (!userId || !email) {
      console.log('User not authenticated, returning error with redirect');
      return NextResponse.json(
        { 
          error: 'Authentication required',
          redirectUrl: `/login?redirectTo=${encodeURIComponent('/subscription')}`
        },
        { status: 401 }
      );
    }
    
    // User is authenticated, get their details
    console.log('Using authenticated user:', { 
      userId: userId.substring(0, 8) + '...', 
      email: email.substring(0, 3) + '...',
      method: authMethod
    });

    try {
      // Create a new checkout session with Stripe
      console.log('Creating Stripe checkout session...');
      const checkoutSession = await stripe.checkout.sessions.create({
        customer_email: email,
        line_items: [
          {
            price: PRODUCTS.PRO.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get('origin')}/subscription?canceled=true`,
        metadata: {
          userId,
          planType,
          authMethod
        },
      });
      
      console.log('Checkout session created:', { id: checkoutSession.id, url: checkoutSession.url });

      // Return the checkout URL
      return NextResponse.json({ url: checkoutSession.url });
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      return NextResponse.json(
        { error: 'Stripe checkout session creation failed' },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 