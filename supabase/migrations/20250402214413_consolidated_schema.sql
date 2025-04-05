-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ai_models table
CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    api_key TEXT,
    base_url TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS for ai_models
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read ai_models" ON public.ai_models;
DROP POLICY IF EXISTS "Any authenticated user can insert ai_models" ON public.ai_models;
DROP POLICY IF EXISTS "Users can update their own ai_models" ON public.ai_models;
DROP POLICY IF EXISTS "Users can delete their own ai_models" ON public.ai_models;

-- Create new policies with proper ownership checks
CREATE POLICY "Anyone can read ai_models"
    ON public.ai_models FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Any authenticated user can insert ai_models"
    ON public.ai_models FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai_models"
    ON public.ai_models FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai_models"
    ON public.ai_models FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_model UUID REFERENCES public.ai_models(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
CREATE POLICY "Users can read their own settings"
    ON public.user_settings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create searches table
CREATE TABLE IF NOT EXISTS searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create papers table
CREATE TABLE IF NOT EXISTS papers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER,
    abstract TEXT,
    doi TEXT,
    search_id UUID REFERENCES searches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for search_id in papers
CREATE INDEX IF NOT EXISTS idx_papers_search_id ON papers(search_id);

-- Create pdf_uploads table
CREATE TABLE IF NOT EXISTS pdf_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filename TEXT NOT NULL,
    title TEXT,
    authors TEXT,
    year INTEGER,
    doi TEXT,
    background TEXT,
    full_text TEXT,
    markdown_content TEXT,
    research_question TEXT,
    major_findings TEXT,
    suggestions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pdf_batches table
CREATE TABLE IF NOT EXISTS pdf_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create batch_pdfs table (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS batch_pdfs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    batch_id UUID REFERENCES pdf_batches(id) ON DELETE CASCADE,
    pdf_id UUID REFERENCES pdf_uploads(id) ON DELETE CASCADE,
    UNIQUE(batch_id, pdf_id)
);

-- Create indexes for batch_pdfs
CREATE INDEX IF NOT EXISTS idx_batch_pdfs_batch_id ON batch_pdfs(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_pdfs_pdf_id ON batch_pdfs(pdf_id);

-- Create firecrawl_api_keys table
CREATE TABLE IF NOT EXISTS firecrawl_api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    api_key TEXT NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create zotero_credentials table
CREATE TABLE IF NOT EXISTS public.zotero_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    zotero_user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create index for zotero_credentials
CREATE INDEX IF NOT EXISTS idx_zotero_credentials_user_id ON public.zotero_credentials(user_id);

-- Create storage bucket for PDFs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'pdfs'
    ) THEN
        INSERT INTO storage.buckets (id, name)
        VALUES ('pdfs', 'pdfs');
    END IF;
END $$;

-- Enable RLS for all tables
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE firecrawl_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zotero_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (for development)
DO $$
BEGIN
    -- searches
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'searches' AND policyname = 'Allow all operations on searches'
    ) THEN
        CREATE POLICY "Allow all operations on searches" ON searches FOR ALL USING (true);
    END IF;

    -- papers
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'papers' AND policyname = 'Allow all operations on papers'
    ) THEN
        CREATE POLICY "Allow all operations on papers" ON papers FOR ALL USING (true);
    END IF;

    -- pdf_uploads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pdf_uploads' AND policyname = 'Allow all operations on pdf_uploads'
    ) THEN
        CREATE POLICY "Allow all operations on pdf_uploads" ON pdf_uploads FOR ALL USING (true);
    END IF;

    -- pdf_batches
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pdf_batches' AND policyname = 'Allow all operations on pdf_batches'
    ) THEN
        CREATE POLICY "Allow all operations on pdf_batches" ON pdf_batches FOR ALL USING (true);
    END IF;

    -- batch_pdfs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'batch_pdfs' AND policyname = 'Allow all operations on batch_pdfs'
    ) THEN
        CREATE POLICY "Allow all operations on batch_pdfs" ON batch_pdfs FOR ALL USING (true);
    END IF;

    -- firecrawl_api_keys
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'firecrawl_api_keys' AND policyname = 'Allow all operations on firecrawl_api_keys'
    ) THEN
        CREATE POLICY "Allow all operations on firecrawl_api_keys" ON firecrawl_api_keys FOR ALL USING (true);
    END IF;

    -- zotero_credentials
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'zotero_credentials' AND policyname = 'Allow all operations on zotero_credentials'
    ) THEN
        CREATE POLICY "Allow all operations on zotero_credentials" ON zotero_credentials FOR ALL USING (true);
    END IF;
END $$;

-- Create storage policy
DROP POLICY IF EXISTS "Allow public access to PDFs" ON storage.objects;
CREATE POLICY "Allow public access to PDFs" ON storage.objects
    FOR ALL USING (bucket_id = 'pdfs');

-- Modify the default model insert to include null user_id (system model)
DELETE FROM public.ai_models WHERE name = 'Default OpenAI';
INSERT INTO public.ai_models (name, provider, model_name, is_default, user_id)
VALUES ('Default OpenAI', 'openai', 'gpt-4-turbo-preview', true, null)
ON CONFLICT DO NOTHING;

-- Add AI models table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    base_url TEXT,
    model_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for ai_models
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI models"
    ON ai_models FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI models"
    ON ai_models FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI models"
    ON ai_models FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI models"
    ON ai_models FOR DELETE
    USING (auth.uid() = user_id); 
