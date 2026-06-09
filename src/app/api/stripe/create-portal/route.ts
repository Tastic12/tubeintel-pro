import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/utils/stripe';
import { createAdminClient } from '@/utils/supabase/server';
import { getRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const requestUser = await getRequestUser();
    if (!requestUser) {
      const origin =
        req.headers.get('origin') ||
        (req.nextUrl && req.nextUrl.origin) ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'http://localhost:3000';
      return NextResponse.redirect(`${origin}/login?redirectTo=/dashboard`);
    }

    const adminClient = createAdminClient();
    const { data: sub, error: subError } = await adminClient
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', requestUser.id)
      .eq('status', 'active')
      .maybeSingle();

    if (subError || !sub || !sub.stripe_customer_id) {
      return NextResponse.json({ error: 'No active subscription or Stripe customer found.' }, { status: 404 });
    }

    // Create a Stripe billing portal session
    const stripe = getServerStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
    }

    // Determine the correct origin for the return_url
    const origin =
      req.headers.get('origin') ||
      (req.nextUrl && req.nextUrl.origin) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    // Redirect the user to the Stripe portal
    return NextResponse.redirect(portalSession.url);
  } catch (error: any) {
    console.error('Error creating Stripe portal session:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 