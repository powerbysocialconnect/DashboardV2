-- Additive migration: fulfillment fields on orders
-- SAFE: ADD COLUMN IF NOT EXISTS — existing rows get defaults, existing queries unaffected
-- Existing order creation, status updates, and webhook flows continue working unchanged.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'unfulfilled';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_url text NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_carrier text NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_notes text NULL;

-- Index for filtering orders by fulfillment status
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status
  ON public.orders(fulfillment_status);
