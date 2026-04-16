-- Add custom_storefront_url to stores table
-- This allows headless stores or stores with external frontends to override the "Visit Store" links
ALTER TABLE stores ADD COLUMN IF NOT EXISTS custom_storefront_url TEXT;
