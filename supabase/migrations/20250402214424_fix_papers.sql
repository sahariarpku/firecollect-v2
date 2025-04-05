-- Add user_id column to papers if it doesn't exist
ALTER TABLE papers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop existing development policy if it exists
DROP POLICY IF EXISTS "Allow all operations on papers" ON papers;
DROP POLICY IF EXISTS "Users can view their own papers" ON papers;
DROP POLICY IF EXISTS "Users can create their own papers" ON papers;
DROP POLICY IF EXISTS "Users can update their own papers" ON papers;
DROP POLICY IF EXISTS "Users can delete their own papers" ON papers;

-- Create proper RLS policies for papers
CREATE POLICY "Users can view their own papers"
    ON papers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM searches
            WHERE searches.id = papers.search_id
            AND searches.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own papers"
    ON papers FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM searches
            WHERE searches.id = papers.search_id
            AND searches.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own papers"
    ON papers FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM searches
            WHERE searches.id = papers.search_id
            AND searches.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM searches
            WHERE searches.id = papers.search_id
            AND searches.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own papers"
    ON papers FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM searches
            WHERE searches.id = papers.search_id
            AND searches.user_id = auth.uid()
        )
    );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_papers_user_id ON papers(user_id);

-- First, delete any existing papers without a user_id
DELETE FROM papers WHERE user_id IS NULL;

-- Now we can safely set the NOT NULL constraint
ALTER TABLE papers ALTER COLUMN user_id SET NOT NULL; 