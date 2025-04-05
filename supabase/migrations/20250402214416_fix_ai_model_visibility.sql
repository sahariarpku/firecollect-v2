-- First, drop all existing policies
DO $$ 
BEGIN
    -- Drop all existing policies on ai_models
    DROP POLICY IF EXISTS "Anyone can read ai_models" ON ai_models;
    DROP POLICY IF EXISTS "Any authenticated user can insert ai_models" ON ai_models;
    DROP POLICY IF EXISTS "Users can update their own ai_models" ON ai_models;
    DROP POLICY IF EXISTS "Users can delete their own ai_models" ON ai_models;
    DROP POLICY IF EXISTS "Users can view their own and system AI models" ON ai_models;
    DROP POLICY IF EXISTS "Users can insert their own AI models" ON ai_models;
    DROP POLICY IF EXISTS "Users can update their own AI models" ON ai_models;
    DROP POLICY IF EXISTS "Users can delete their own AI models" ON ai_models;
END $$;

-- Create new policies
CREATE POLICY "Users can view their own and system AI models"
    ON ai_models FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        user_id IS NULL
    );

CREATE POLICY "Users can insert their own AI models"
    ON ai_models FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own AI models"
    ON ai_models FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI models"
    ON ai_models FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id); 