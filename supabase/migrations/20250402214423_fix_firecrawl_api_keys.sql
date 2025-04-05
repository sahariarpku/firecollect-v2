-- Add user_id column to firecrawl_api_keys if it doesn't exist
ALTER TABLE firecrawl_api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop existing development policy if it exists
DROP POLICY IF EXISTS "Allow all operations on firecrawl_api_keys" ON firecrawl_api_keys;
DROP POLICY IF EXISTS "Users can view their own firecrawl_api_keys" ON firecrawl_api_keys;
DROP POLICY IF EXISTS "Users can create their own firecrawl_api_keys" ON firecrawl_api_keys;
DROP POLICY IF EXISTS "Users can update their own firecrawl_api_keys" ON firecrawl_api_keys;
DROP POLICY IF EXISTS "Users can delete their own firecrawl_api_keys" ON firecrawl_api_keys;

-- Create proper RLS policies for firecrawl_api_keys
CREATE POLICY "Users can view their own firecrawl_api_keys"
    ON firecrawl_api_keys FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own firecrawl_api_keys"
    ON firecrawl_api_keys FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own firecrawl_api_keys"
    ON firecrawl_api_keys FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own firecrawl_api_keys"
    ON firecrawl_api_keys FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_firecrawl_api_keys_user_id ON firecrawl_api_keys(user_id);

-- First, delete any existing keys without a user_id
DELETE FROM firecrawl_api_keys WHERE user_id IS NULL;

-- Now we can safely set the NOT NULL constraint
ALTER TABLE firecrawl_api_keys ALTER COLUMN user_id SET NOT NULL; 