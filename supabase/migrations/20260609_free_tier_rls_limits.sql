-- Enforce free-tier folder/channel/video limits at the database layer (RLS).

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
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

CREATE OR REPLACE FUNCTION public.user_has_active_subscription(user_uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_active BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE
      user_id = user_uid AND
      status = 'active' AND
      plan_type = 'pro' AND
      current_period_end > now()
  ) INTO has_active;

  RETURN has_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_plan_type(user_uid UUID)
RETURNS TEXT AS $$
BEGIN
  IF public.user_has_active_subscription(user_uid) THEN
    RETURN 'pro';
  END IF;
  RETURN 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Users can create their own competitor lists" ON public.competitor_lists;
CREATE POLICY "Users can create their own competitor lists"
ON public.competitor_lists FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    public.get_user_plan_type(auth.uid()) = 'pro' OR
    (SELECT count(*)::int FROM public.competitor_lists WHERE user_id = auth.uid()) < 1
  )
);

DROP POLICY IF EXISTS "Users can add competitors to their lists" ON public.tracked_competitors;
CREATE POLICY "Users can add competitors to their lists"
ON public.tracked_competitors FOR INSERT
WITH CHECK (
  list_id IN (
    SELECT id FROM public.competitor_lists WHERE user_id = auth.uid()
  ) AND (
    public.get_user_plan_type(auth.uid()) = 'pro' OR
    (SELECT count(*)::int FROM public.tracked_competitors WHERE list_id = tracked_competitors.list_id) < 5
  )
);

DROP POLICY IF EXISTS "Users can create their own video collections" ON public.video_collections;
CREATE POLICY "Users can create their own video collections"
ON public.video_collections FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    public.get_user_plan_type(auth.uid()) = 'pro' OR
    (SELECT count(*)::int FROM public.video_collections WHERE user_id = auth.uid()) < 1
  )
);

DROP POLICY IF EXISTS "Users can add videos to their collections" ON public.tracked_videos;
CREATE POLICY "Users can add videos to their collections"
ON public.tracked_videos FOR INSERT
WITH CHECK (
  collection_id IN (
    SELECT id FROM public.video_collections WHERE user_id = auth.uid()
  ) AND (
    public.get_user_plan_type(auth.uid()) = 'pro' OR
    (SELECT count(*)::int FROM public.tracked_videos WHERE collection_id = tracked_videos.collection_id) < 5
  )
);
