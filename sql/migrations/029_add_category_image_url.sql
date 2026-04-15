-- Add image_url to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update RLS policies if necessary (usually select * handles it, but good to check)
-- No changes needed to RLS if it's already using select *
