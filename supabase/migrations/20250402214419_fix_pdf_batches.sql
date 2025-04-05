-- Add user_id column to pdf_batches if it doesn't exist
ALTER TABLE pdf_batches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop existing development policy if it exists
DROP POLICY IF EXISTS "Allow all operations on pdf_batches" ON pdf_batches;

-- Create proper RLS policies for pdf_batches
CREATE POLICY "Users can view their own pdf batches"
    ON pdf_batches FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pdf batches"
    ON pdf_batches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pdf batches"
    ON pdf_batches FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pdf batches"
    ON pdf_batches FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pdf_batches_user_id ON pdf_batches(user_id);

-- First, delete any existing batches without a user_id
DELETE FROM pdf_batches WHERE user_id IS NULL;

-- Now we can safely set the NOT NULL constraint
ALTER TABLE pdf_batches ALTER COLUMN user_id SET NOT NULL; 