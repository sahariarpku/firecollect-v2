-- Drop existing development policies
DROP POLICY IF EXISTS "Allow all operations on searches" ON searches;
DROP POLICY IF EXISTS "Allow all operations on papers" ON papers;
DROP POLICY IF EXISTS "Allow all operations on pdf_uploads" ON pdf_uploads;
DROP POLICY IF EXISTS "Allow all operations on pdf_batches" ON pdf_batches;
DROP POLICY IF EXISTS "Allow all operations on batch_pdfs" ON batch_pdfs;
DROP POLICY IF EXISTS "Allow all operations on firecrawl_api_keys" ON firecrawl_api_keys;
DROP POLICY IF EXISTS "Allow all operations on zotero_credentials" ON zotero_credentials;

-- Add user_id column to tables that don't have it
ALTER TABLE searches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE papers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE pdf_uploads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE pdf_batches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE batch_pdfs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create new policies for proper user isolation
CREATE POLICY "Users can view their own searches"
    ON searches FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches"
    ON searches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searches"
    ON searches FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own papers"
    ON papers FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own papers"
    ON papers FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own papers"
    ON papers FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own PDFs"
    ON pdf_uploads FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDFs"
    ON pdf_uploads FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDFs"
    ON pdf_uploads FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDFs"
    ON pdf_uploads FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own PDF batches"
    ON pdf_batches FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDF batches"
    ON pdf_batches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDF batches"
    ON pdf_batches FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDF batches"
    ON pdf_batches FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own batch PDFs"
    ON batch_pdfs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batch PDFs"
    ON batch_pdfs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batch PDFs"
    ON batch_pdfs FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own API keys"
    ON firecrawl_api_keys FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
    ON firecrawl_api_keys FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
    ON firecrawl_api_keys FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
    ON firecrawl_api_keys FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Update existing records to set user_id based on related records
UPDATE searches s
SET user_id = p.user_id
FROM papers p
WHERE s.id = p.search_id AND s.user_id IS NULL;

-- Update PDF batches to set user_id based on related PDFs
UPDATE pdf_batches pb
SET user_id = pu.user_id
FROM batch_pdfs bp
JOIN pdf_uploads pu ON bp.pdf_id = pu.id
WHERE pb.id = bp.batch_id AND pb.user_id IS NULL;

-- Update batch_pdfs to set user_id based on related PDFs
UPDATE batch_pdfs bp
SET user_id = pu.user_id
FROM pdf_uploads pu
WHERE bp.pdf_id = pu.id AND bp.user_id IS NULL; 