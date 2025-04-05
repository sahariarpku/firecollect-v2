-- Ensure user_id column exists and is properly constrained
ALTER TABLE public.ai_models ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing rows to have user_id (if any exist)
UPDATE public.ai_models SET user_id = auth.uid() WHERE user_id IS NULL;

-- Make user_id NOT NULL after ensuring all rows have a value
ALTER TABLE public.ai_models ALTER COLUMN user_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_models_user_id ON public.ai_models(user_id); 