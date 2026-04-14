-- Additive migration: store_events table
-- Central event log for commerce/system events (orders, payments, refunds, fulfillment, admin actions)
-- Safe: CREATE TABLE IF NOT EXISTS — no impact on existing tables

CREATE TABLE IF NOT EXISTS public.store_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  source text NOT NULL,           -- stripe | system | admin | dashboard
  event_type text NOT NULL,       -- checkout.session.completed | order.created | order.refunded | etc.
  event_status text NULL,         -- success | failed | pending
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_events_store_id
  ON public.store_events(store_id);

CREATE INDEX IF NOT EXISTS idx_store_events_order_id
  ON public.store_events(order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_events_event_type
  ON public.store_events(event_type);

CREATE INDEX IF NOT EXISTS idx_store_events_created_at
  ON public.store_events(created_at DESC);

-- Composite for querying recent events per store
CREATE INDEX IF NOT EXISTS idx_store_events_store_type_created
  ON public.store_events(store_id, event_type, created_at DESC);

-- RLS
ALTER TABLE public.store_events ENABLE ROW LEVEL SECURITY;

-- Store owners can read their own events
CREATE POLICY IF NOT EXISTS "store_events_select_own"
  ON public.store_events FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only server (service role) and admins can insert events
CREATE POLICY IF NOT EXISTS "store_events_insert_admin"
  ON public.store_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
