-- Add social links and footer content to the stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS footer_headline TEXT,
ADD COLUMN IF NOT EXISTS footer_description TEXT;

-- Update the RLS policies if needed, but since we are adds columns to 'stores', 
-- the existing policies (select for everyone, write for admins) should cover it.

COMMENT ON COLUMN stores.social_links IS 'JSON object containing social media URLs (facebook, instagram, youtube, tiktok, x)';
COMMENT ON COLUMN stores.footer_headline IS 'Centered large headline for the store footer';
COMMENT ON COLUMN stores.footer_description IS 'Centered brand story or description for the store footer';
