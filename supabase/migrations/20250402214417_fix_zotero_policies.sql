-- Drop existing development policy
DROP POLICY IF EXISTS "Allow all operations on zotero_credentials" ON zotero_credentials;

-- Create proper RLS policies for zotero_credentials
CREATE POLICY "Users can view their own Zotero credentials"
    ON zotero_credentials FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Zotero credentials"
    ON zotero_credentials FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Zotero credentials"
    ON zotero_credentials FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Zotero credentials"
    ON zotero_credentials FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id); 