import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/utils/stripe';
import { PRODUCTS } from '@/utils/stripe';
import { getRequestUser } from '@/lib/request-auth';

export async function POST(req: NextRequest) {
  try {
    // Get the request data
    const { priceId, planType } = await req.json();
    
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

    const requestUser = await getRequestUser();
    if (!requestUser) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          redirectUrl: `/login?redirectTo=${encodeURIComponent('/subscription')}`,
        },
        { status: 401 }
      );
    }

    const userId = requestUser.id;
    const email = requestUser.email;

    try {
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
          authMethod: 'validated_token',
        },
      });

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