-- Additive migration: refund fields on orders
-- SAFE: ADD COLUMN IF NOT EXISTS — existing rows get null defaults, existing queries unaffected
-- The Stripe webhook handler will populate these when charge.refunded events arrive.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refund_status text NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz NULL;

-- stripe_payment_intent_id is needed to resolve orders from Stripe refund events
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text NULL;

CREATE INDEX IF NOT EXISTS idx_orders_refund_status
  ON public.orders(refund_status)
  WHERE refund_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
  ON public.orders(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
