-- 032_fix_status_history_rls.sql
-- Allow store owners to also record status history changes, 
-- in addition to admins. This prevents RLS violations when 
-- a merchant (or an admin-acting-as-merchant) toggles store status.

DROP POLICY IF EXISTS "store_status_history_insert_admin" ON public.store_status_history;

CREATE POLICY "store_status_history_insert"
  ON public.store_status_history FOR INSERT
  WITH CHECK (
    -- Admin can insert for any store
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR
    -- Owner can insert for their own store
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

-- Also ensure store owners can read their own history if not already covered
DROP POLICY IF EXISTS "store_status_history_select" ON public.store_status_history;

CREATE POLICY "store_status_history_select"
  ON public.store_status_history FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
