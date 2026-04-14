-- Add missing columns to store_billing_settings
-- These were missing from the production schema but expected by the Admin Dashboard code.

ALTER TABLE public.store_billing_settings 
  ADD COLUMN IF NOT EXISTS billing_status text,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_status text default 'active',
  ADD COLUMN IF NOT EXISTS subscription_frequency text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz;

-- Refresh the schema cache hint (if running via some tools, this helps)
COMMENT ON TABLE public.store_billing_settings IS 'Stores subscription and billing settings for PixeoCommerce stores.';
