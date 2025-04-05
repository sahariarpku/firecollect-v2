-- Add user_id column to ai_models if it doesn't exist
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop existing development policy if it exists
DROP POLICY IF EXISTS "Allow all operations on ai_models" ON ai_models;

-- Create proper RLS policies for ai_models
CREATE POLICY "Users can view their own AI models"
    ON ai_models FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI models"
    ON ai_models FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI models"
    ON ai_models FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI models"
    ON ai_models FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_models_user_id ON ai_models(user_id);

-- First, delete any existing models without a user_id
DELETE FROM ai_models WHERE user_id IS NULL;

-- Now we can safely set the NOT NULL constraint
ALTER TABLE ai_models ALTER COLUMN user_id SET NOT NULL; 