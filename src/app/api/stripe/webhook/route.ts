import { NextRequest, NextResponse } from 'next/server';
import { stripe, getServerStripe } from '@/utils/stripe';
import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

// Get the appropriate webhook secret based on environment
const webhookSecret = process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_WEBHOOK_SECRET_LIVE 
  : process.env.STRIPE_WEBHOOK_SECRET_TEST;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature') || '';
    
    if (!webhookSecret) {
      console.error('Missing Stripe webhook secret');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    // Get stripe instance or return error if not available
    const stripeInstance = getServerStripe();
    if (!stripeInstance) {
      console.error('Stripe is not properly configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    
    // Verify the webhook signature
    let event;
    try {
      event = stripeInstance.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
    
    // Handle specific events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract metadata from the session
        const userId = session.metadata?.userId;
        const planType = session.metadata?.planType;
        
        if (userId && planType) {
          // Store subscription data in your database
          const supabase = createClient();
          
          // Check if customer exists
          let customerId = session.customer;
          
          // Update user's subscription in database
          const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: session.subscription,
              plan_type: planType,
              status: 'active',
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now as placeholder
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (error) {
            console.error('Error updating subscription:', error);
            // We don't want to return an error status to Stripe
            // as this would cause them to retry the webhook
          }
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        // Handle successful recurring payment
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        // Access subscription safely - subscription could be string or Stripe.Subscription
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer as string | undefined;
        
        if (subscriptionId) {
          const supabase = createClient();
          
          // Get subscription details from Stripe
          const subscriptionResponse = await stripeInstance.subscriptions.retrieve(subscriptionId);
          const subscription = subscriptionResponse as unknown as Stripe.Subscription & { current_period_end: number };
          
          // Find user by customer ID
          const { data: userData, error: userError } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();
            
          if (userError || !userData) {
            console.error('Error finding user for customer:', customerId, userError);
            break;
          }
          
          // Update subscription period end date
          const periodEnd = subscription.current_period_end; // Unix timestamp
          const { error } = await supabase
            .from('user_subscriptions')
            .update({
              current_period_end: new Date(periodEnd * 1000).toISOString(),
              status: subscription.status,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.user_id);
            
          if (error) {
            console.error('Error updating subscription period:', error);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        // Handle failed payment by canceling the subscription immediately
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        // Access subscription safely - subscription could be string or Stripe.Subscription
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer as string | undefined;
        
        if (subscriptionId && customerId) {
          const supabase = createClient();
          
          // Find user by customer ID
          const { data: userData, error: userError } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();
            
          if (userError || !userData) {
            console.error('Error finding user for customer:', customerId, userError);
            break;
          }
          
          // Set subscription status to canceled
          const { error } = await supabase
            .from('user_subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.user_id);
            
          if (error) {
            console.error('Error updating subscription to canceled after payment failure:', error);
          }
          
          console.log(`Subscription ${subscriptionId} canceled due to payment failure for user ${userData.user_id}`);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end: number };
        const customerId = subscription.customer as string | undefined;
        
        if (!customerId) {
          console.error('No valid customer ID found for subscription update');
          break;
        }
        
        // Get user by customer ID
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase
          .from('user_subscriptions')
          .select('user_id, plan_type')
          .eq('stripe_customer_id', customerId)
          .single();
          
        if (userError || !userData) {
          console.error('Error finding user for customer:', customerId, userError);
          break;
        }
        
        // Determine plan type based on product ID
        let newPlanType: 'free' | 'pro' = 'pro'; // Default to pro for any paid subscription
        
        // Get the previous plan for upgrade detection
        const { data: userDetails } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', userData.user_id)
          .single();
        
        const previousPlan = userDetails?.subscription_tier || 'free';
        
        // Check if this is an upgrade (free -> pro)
        const isUpgrade = previousPlan === 'free' && newPlanType === 'pro';
        
        // Update subscription status
        const periodEnd = subscription.current_period_end; // Unix timestamp
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            plan_type: newPlanType,
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userData.user_id);
          
        if (error) {
          console.error('Error updating subscription status:', error);
        }
        
        // If this is an upgrade, store a flag in Supabase Realtime Broadcast to notify clients
        if (isUpgrade) {
          try {
            // Create a subscription_upgraded event in a special table for the user
            await supabase
              .from('subscription_events')
              .insert({
                user_id: userData.user_id,
                event_type: 'upgrade',
                previous_plan: previousPlan,
                new_plan: newPlanType,
                created_at: new Date().toISOString()
              });
              
            console.log(`Subscription upgrade event created for user ${userData.user_id}`);
          } catch (eventError) {
            console.error('Error creating upgrade event:', eventError);
          }
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string | undefined;
        
        if (!customerId) {
          console.error('Invalid customer ID for subscription deletion event');
          break;
        }
        
        // Get user by customer ID
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();
          
        if (userError || !userData) {
          console.error('Error finding user for customer:', customerId, userError);
          break;
        }
        
        // Update subscription status to cancelled
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userData.user_id);
          
        if (error) {
          console.error('Error updating subscription cancellation:', error);
        }
        break;
      }
    }
    
    // Return a successful response to Stripe
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 