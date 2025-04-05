-- Add user_id column to pdf_uploads if it doesn't exist
ALTER TABLE pdf_uploads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop existing development policy if it exists
DROP POLICY IF EXISTS "Allow all operations on pdf_uploads" ON pdf_uploads;

-- Create proper RLS policies for pdf_uploads
CREATE POLICY "Users can view their own pdf uploads"
    ON pdf_uploads FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pdf uploads"
    ON pdf_uploads FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pdf uploads"
    ON pdf_uploads FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pdf uploads"
    ON pdf_uploads FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id ON pdf_uploads(user_id);

-- First, delete any existing uploads without a user_id
DELETE FROM pdf_uploads WHERE user_id IS NULL;

-- Now we can safely set the NOT NULL constraint
ALTER TABLE pdf_uploads ALTER COLUMN user_id SET NOT NULL; 