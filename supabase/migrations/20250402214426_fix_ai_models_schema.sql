-- Drop existing ai_models table if it exists
DROP TABLE IF EXISTS ai_models;

-- Create ai_models table with proper schema
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    base_url TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS for ai_models
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

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

-- Insert default AI model
INSERT INTO ai_models (name, provider, model_name, api_key, is_default, user_id)
VALUES ('Default OpenAI', 'openai', 'gpt-4-turbo-preview', '', true, auth.uid())
ON CONFLICT DO NOTHING; 