-- Add the tour_completed column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT false;

-- Add an index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_tour_completed 
ON public.profiles(tour_completed);

-- Add a comment to explain the column's purpose
COMMENT ON COLUMN public.profiles.tour_completed IS 
'Tracks whether the user has completed the initial tour guide. Defaults to false for new users.';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'tour_completed'; 