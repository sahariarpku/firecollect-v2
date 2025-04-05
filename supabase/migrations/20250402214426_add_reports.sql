-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('generating', 'completed', 'error')),
    search_query TEXT NOT NULL,
    structure JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create report_sections table
CREATE TABLE IF NOT EXISTS report_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;

-- Reports policies
CREATE POLICY "Users can view their own reports"
    ON reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
    ON reports FOR UPDATE
    USING (auth.uid() = user_id);

-- Report sections policies
CREATE POLICY "Users can view their own report sections"
    ON report_sections FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM reports
        WHERE reports.id = report_sections.report_id
        AND reports.user_id = auth.uid()
    ));

CREATE POLICY "Users can create sections for their own reports"
    ON report_sections FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM reports
        WHERE reports.id = report_sections.report_id
        AND reports.user_id = auth.uid()
    ));

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_sections_updated_at
    BEFORE UPDATE ON report_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 