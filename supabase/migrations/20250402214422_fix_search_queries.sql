-- Add user_id column to searches if it doesn't exist
ALTER TABLE searches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all operations on searches" ON searches;
DROP POLICY IF EXISTS "Users can view their own searches" ON searches;
DROP POLICY IF EXISTS "Users can create their own searches" ON searches;
DROP POLICY IF EXISTS "Users can update their own searches" ON searches;
DROP POLICY IF EXISTS "Users can delete their own searches" ON searches;

-- Create proper RLS policies for searches
CREATE POLICY "Users can view their own searches"
    ON searches FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own searches"
    ON searches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own searches"
    ON searches FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searches"
    ON searches FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);

-- First, delete any existing searches without a user_id
DELETE FROM searches WHERE user_id IS NULL;

-- Now we can safely set the NOT NULL constraint
ALTER TABLE searches ALTER COLUMN user_id SET NOT NULL; 