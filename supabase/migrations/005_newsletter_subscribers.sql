-- ============================================================================
-- SHANTETY E-COMMERCE PLATFORM (شنطتي)
-- MIGRATION 005: Newsletter Subscribers Table & Row Level Security
-- Target Database: Supabase PostgreSQL
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source text NOT NULL DEFAULT 'homepage_footer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_newsletter_subscribers_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON public.newsletter_subscribers(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 1. Public Storefront: Anyone can subscribe their email
DROP POLICY IF EXISTS newsletter_subscribers_public_insert ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_public_insert ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

-- 2. Authenticated Admins: Full read access to subscriber list
DROP POLICY IF EXISTS newsletter_subscribers_admin_select ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_admin_select ON public.newsletter_subscribers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

-- 3. Authenticated Admins: Update subscriber status
DROP POLICY IF EXISTS newsletter_subscribers_admin_update ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_admin_update ON public.newsletter_subscribers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'store_manager')
    )
  );

COMMIT;
