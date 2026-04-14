-- Add a column to track if the merchant has actually finished Stripe onboarding
-- This prevents the "Connected" status from showing prematurely.
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT false;
