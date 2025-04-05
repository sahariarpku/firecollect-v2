-- Create a function to handle default model changes
CREATE OR REPLACE FUNCTION handle_default_model_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a model as default
    IF NEW.is_default = true THEN
        -- First, ensure the model belongs to the same user (or is system model)
        IF NEW.user_id IS NOT NULL THEN
            -- Clear default flag from all other models belonging to the same user
            UPDATE ai_models
            SET is_default = false
            WHERE user_id = NEW.user_id 
            AND id != NEW.id;
        ELSE
            -- For system models (user_id is null)
            UPDATE ai_models
            SET is_default = false
            WHERE user_id IS NULL 
            AND id != NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_single_default_model ON ai_models;

-- Create trigger to handle default model changes
CREATE TRIGGER ensure_single_default_model
    BEFORE INSERT OR UPDATE ON ai_models
    FOR EACH ROW
    EXECUTE FUNCTION handle_default_model_changes();

-- Fix any existing data where multiple models are set as default
DO $$
DECLARE
    user_id_var UUID;
BEGIN
    -- Get all user_ids that have multiple default models
    FOR user_id_var IN
        SELECT DISTINCT user_id 
        FROM ai_models 
        WHERE is_default = true 
        GROUP BY user_id 
        HAVING COUNT(*) > 1
    LOOP
        -- Keep only the most recently updated model as default for each user
        UPDATE ai_models
        SET is_default = false
        WHERE user_id = user_id_var
        AND id NOT IN (
            SELECT id
            FROM ai_models
            WHERE user_id = user_id_var
            AND is_default = true
            ORDER BY updated_at DESC
            LIMIT 1
        );
    END LOOP;

    -- Handle system models (user_id is null)
    IF EXISTS (
        SELECT 1 
        FROM ai_models 
        WHERE user_id IS NULL 
        AND is_default = true 
        GROUP BY user_id 
        HAVING COUNT(*) > 1
    ) THEN
        UPDATE ai_models
        SET is_default = false
        WHERE user_id IS NULL
        AND id NOT IN (
            SELECT id
            FROM ai_models
            WHERE user_id IS NULL
            AND is_default = true
            ORDER BY updated_at DESC
            LIMIT 1
        );
    END IF;
END $$; 