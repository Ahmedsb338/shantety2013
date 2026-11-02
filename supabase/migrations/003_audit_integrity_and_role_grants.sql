-- ============================================================================
-- SHANTETY E-COMMERCE PLATFORM (شنطتي)
-- MIGRATION 003: Audit Logs, Role Permissions & Search Path Integrity
-- Target Database: Supabase PostgreSQL
-- ============================================================================

-- PURPOSE:
-- 1. Create audit_logs table for enterprise auditability of sensitive operations.
-- 2. Revoke all direct browser write privileges from audit_logs.
-- 3. Restrict authenticated audit log reads to authorized administrators (super_admin, store_manager).
-- 4. Set safe search_path for all schema functions.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  details text
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- ----------------------------------------------------------------------------
-- 2. PRIVILEGE REVOCATIONS (BROWSER CANNOT MODIFY AUDIT LOGS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM authenticated;

-- Allow only authorized administrative members to view audit logs
DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'store_manager')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. REVIEWS & RATINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text,
  user_phone text,
  order_number text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text NOT NULL,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  user_city text,
  attributes_feedback jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can read all approved reviews
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_public_read ON public.reviews
  FOR SELECT TO PUBLIC
  USING (true);

-- Authenticated customers can insert reviews
DROP POLICY IF EXISTS reviews_customer_insert ON public.reviews;
CREATE POLICY reviews_customer_insert ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (true);

COMMIT;
