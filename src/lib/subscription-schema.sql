-- Create user_subscriptions table for Stripe integration
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing')),
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy to let users read only their own subscription data
CREATE POLICY "Users can view their own subscriptions"
ON user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Policy to let service role insert/update subscriptions via webhook
CREATE POLICY "Service role can modify subscriptions"
ON user_subscriptions FOR ALL
TO service_role
USING (true);

-- Create function to check if user has an active subscription
CREATE OR REPLACE FUNCTION public.user_has_active_subscription(user_uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_active BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions
    WHERE 
      user_id = user_uid AND
      status = 'active' AND
      current_period_end > now()
  ) INTO has_active;
  
  RETURN has_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's current plan type
CREATE OR REPLACE FUNCTION public.get_user_plan_type(user_uid UUID)
RETURNS TEXT AS $$
DECLARE
  plan TEXT;
BEGIN
  IF NOT public.user_has_active_subscription(user_uid) THEN
    RETURN 'free';
  END IF;
  
  SELECT plan_type
  FROM user_subscriptions
  WHERE 
    user_id = user_uid AND
    status = 'active' AND
    current_period_end > now()
  ORDER BY current_period_end DESC
  LIMIT 1
  INTO plan;
  
  RETURN COALESCE(plan, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 