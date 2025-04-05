-- Drop existing constraint
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

-- Add new constraint
ALTER TABLE reports ADD CONSTRAINT reports_status_check 
CHECK (status IN ('generating', 'completed', 'error')); 