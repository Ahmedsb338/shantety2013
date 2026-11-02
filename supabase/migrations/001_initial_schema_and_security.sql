-- ============================================================================
-- SHANTETY E-COMMERCE PLATFORM (شنطتي)
-- MIGRATION 001: Initial Schema, Core Tables, and RLS Privilege Hardening
-- Target Database: Supabase PostgreSQL
-- ============================================================================

-- PURPOSE:
-- Establishes the authoritative database schema for Shantety e-commerce:
-- 1. admin_memberships with RBAC roles (super_admin, store_manager, order_staff)
-- 2. customer_profiles and customer_addresses
-- 3. categories, brands, colors, sizes, products, and product_variants
-- 4. suppliers, purchase_orders, purchase_order_items
-- 5. Strict privilege restrictions (revoking direct public writes, column-level security on product_variants)
-- 6. SECURITY DEFINER function public.manage_admin_membership

-- PRECONDITIONS:
-- Requires PostgreSQL 15+ with extensions "pgcrypto" (for gen_random_uuid) and Supabase "auth" schema.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ADMIN MEMBERSHIPS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'store_manager', 'order_staff')),
  is_active boolean NOT NULL DEFAULT true,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_memberships_user UNIQUE (user_id),
  CONSTRAINT uq_admin_memberships_email UNIQUE (email)
);

-- ----------------------------------------------------------------------------
-- 2. CUSTOMER PROFILES & ADDRESSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  governorate text NOT NULL,
  city text NOT NULL,
  street_address text NOT NULL,
  building_floor text,
  delivery_notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);

-- ----------------------------------------------------------------------------
-- 3. CATALOG & TAXONOMY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  image text,
  item_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.brands (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo text,
  description_ar text,
  description_en text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.colors (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  hex text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sizes (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  type text NOT NULL,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL,
  description_en text NOT NULL,
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id text REFERENCES public.brands(id) ON DELETE SET NULL,
  base_price integer NOT NULL CHECK (base_price >= 0),
  base_sale_price integer CHECK (base_sale_price IS NULL OR base_sale_price >= 0),
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  is_new_arrival boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  materials_ar text,
  materials_en text,
  dimensions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE is_featured = true;

CREATE TABLE IF NOT EXISTS public.product_variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,
  color_id text REFERENCES public.colors(id) ON DELETE SET NULL,
  size_id text REFERENCES public.sizes(id) ON DELETE SET NULL,
  price integer NOT NULL CHECK (price >= 0),
  sale_price integer CHECK (sale_price IS NULL OR sale_price >= 0),
  stock_on_hand integer NOT NULL DEFAULT 0 CHECK (stock_on_hand >= 0),
  stock_reserved integer NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
  image text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.product_variants(sku);

-- ----------------------------------------------------------------------------
-- 4. SUPPLIERS & PURCHASE ORDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text NOT NULL,
  email text,
  city text,
  lead_time_days integer DEFAULT 3,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id text PRIMARY KEY,
  po_number text UNIQUE NOT NULL,
  supplier_id text NOT NULL REFERENCES public.suppliers(id),
  supplier_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),
  total_cost integer NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  expected_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id text PRIMARY KEY,
  purchase_order_id text NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  variant_id text NOT NULL,
  sku text NOT NULL,
  quantity_ordered integer NOT NULL CHECK (quantity_ordered > 0),
  quantity_received integer NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost integer NOT NULL CHECK (unit_cost >= 0)
);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & PRIVILEGE ENFORCEMENT
-- ----------------------------------------------------------------------------
ALTER TABLE public.admin_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Default privilege lockdown: revoke automatic grants for public/anon
REVOKE ALL ON TABLE public.admin_memberships FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.admin_memberships TO authenticated;

-- Customers can view & edit only their own profile and addresses
DROP POLICY IF EXISTS customer_profiles_self ON public.customer_profiles;
CREATE POLICY customer_profiles_self ON public.customer_profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS customer_addresses_self ON public.customer_addresses;
CREATE POLICY customer_addresses_self ON public.customer_addresses
  FOR ALL TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Storefront catalog: anyone can read active products
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO PUBLIC
  USING (true);

-- SAFE STOREFRONT VIEW: Public should only see safe variant fields, NOT raw stock quantities!
REVOKE SELECT ON TABLE public.product_variants FROM PUBLIC, anon;
GRANT SELECT (id, product_id, sku, color_id, size_id, price, sale_price, image, is_active, created_at, updated_at)
  ON TABLE public.product_variants TO PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. SECURITY DEFINER FUNCTION: manage_admin_membership
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_admin_membership(
  target_user_id uuid,
  new_role text,
  new_status boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_id uuid;
  is_owner_user boolean;
  target_is_owner boolean;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Calling user must be authenticated.';
  END IF;

  -- 1. Verify caller is an active store owner
  SELECT is_owner INTO is_owner_user
  FROM public.admin_memberships
  WHERE user_id = calling_user_id AND is_active = true;

  IF is_owner_user IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: Only the store owner can manage administrative memberships.';
  END IF;

  -- 2. Restrict roles to store_manager or order_staff (cannot create another super_admin via this function)
  IF new_role NOT IN ('store_manager', 'order_staff') THEN
    RAISE EXCEPTION 'Invalid role: Can only assign store_manager or order_staff.';
  END IF;

  -- 3. Owner protection: owner cannot be demoted, deactivated, or modified
  SELECT is_owner INTO target_is_owner
  FROM public.admin_memberships
  WHERE user_id = target_user_id;

  IF target_is_owner IS TRUE THEN
    RAISE EXCEPTION 'Protected: The store owner membership cannot be modified or demoted.';
  END IF;

  -- 4. Upsert membership
  INSERT INTO public.admin_memberships (user_id, email, role, is_active, is_owner, updated_at)
  VALUES (
    target_user_id,
    (SELECT email FROM auth.users WHERE id = target_user_id),
    new_role,
    new_status,
    false,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', target_user_id,
    'role', new_role,
    'is_active', new_status
  );
END;
$$;

COMMIT;
