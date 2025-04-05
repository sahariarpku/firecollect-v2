-- Drop existing development policy if it exists
DROP POLICY IF EXISTS "Allow all operations on batch_pdfs" ON batch_pdfs;

-- Create proper RLS policies for batch_pdfs
CREATE POLICY "Users can view their own batch_pdfs"
    ON batch_pdfs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM pdf_batches
            WHERE pdf_batches.id = batch_pdfs.batch_id
            AND pdf_batches.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own batch_pdfs"
    ON batch_pdfs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM pdf_batches
            WHERE pdf_batches.id = batch_pdfs.batch_id
            AND pdf_batches.user_id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM pdf_uploads
            WHERE pdf_uploads.id = batch_pdfs.pdf_id
            AND pdf_uploads.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own batch_pdfs"
    ON batch_pdfs FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM pdf_batches
            WHERE pdf_batches.id = batch_pdfs.batch_id
            AND pdf_batches.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM pdf_batches
            WHERE pdf_batches.id = batch_pdfs.batch_id
            AND pdf_batches.user_id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM pdf_uploads
            WHERE pdf_uploads.id = batch_pdfs.pdf_id
            AND pdf_uploads.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own batch_pdfs"
    ON batch_pdfs FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM pdf_batches
            WHERE pdf_batches.id = batch_pdfs.batch_id
            AND pdf_batches.user_id = auth.uid()
        )
    ); 