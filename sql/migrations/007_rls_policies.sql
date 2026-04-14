-- RLS policies for all new tables
-- These enable row-level security without affecting existing table policies

-- store_theme_configs
ALTER TABLE public.store_theme_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "store_theme_configs_select_own"
  ON public.store_theme_configs FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_theme_configs_insert_own"
  ON public.store_theme_configs FOR INSERT
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_theme_configs_update_own"
  ON public.store_theme_configs FOR UPDATE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_theme_configs_delete_admin"
  ON public.store_theme_configs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- store_status_history
ALTER TABLE public.store_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "store_status_history_select"
  ON public.store_status_history FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_status_history_insert_admin"
  ON public.store_status_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- store_onboarding_tasks
ALTER TABLE public.store_onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "store_onboarding_tasks_select_own"
  ON public.store_onboarding_tasks FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_onboarding_tasks_update_own"
  ON public.store_onboarding_tasks FOR UPDATE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_onboarding_tasks_insert_admin"
  ON public.store_onboarding_tasks FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- store_domains
ALTER TABLE public.store_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "store_domains_select_own"
  ON public.store_domains FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_domains_insert_own"
  ON public.store_domains FOR INSERT
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_domains_update_own"
  ON public.store_domains FOR UPDATE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY IF NOT EXISTS "store_domains_delete_admin"
  ON public.store_domains FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Public read for storefront: anyone can read theme config for a published store
CREATE POLICY IF NOT EXISTS "store_theme_configs_public_read"
  ON public.store_theme_configs FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE status = 'live' AND is_disabled = false)
  );
