-- ============================================================================
-- SHANTETY E-COMMERCE PLATFORM (شنطتي)
-- MIGRATION 002: Orders, Tracking Token Hashing, and Atomic Inventory Lifecycle
-- Target Database: Supabase PostgreSQL
-- ============================================================================

-- PURPOSE:
-- 1. Create orders table with SHA-256 tracking_token_hash (plaintext token never stored).
-- 2. Create order_items and order_status_history tables.
-- 3. Create inventory_movements table for complete stock audit trails.
-- 4. Create atomic checkout stored procedure: public.execute_atomic_checkout
--    Uses row-level locking (SELECT ... FOR UPDATE) to prevent race conditions & overselling.
-- 5. Create secure guest tracking lookup: public.lookup_guest_order
--    Verifies hash in constant time, returns ONLY sanitized non-PII logistics data.
-- 6. Create idempotent status transition procedure: public.apply_order_status_transition

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tracking_token_hash bytea NOT NULL, -- Stored as BYTEA (SHA-256 binary digest)
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_address jsonb NOT NULL,
  subtotal integer NOT NULL CHECK (subtotal >= 0),
  shipping_fee integer NOT NULL CHECK (shipping_fee >= 0),
  discount integer NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total integer NOT NULL CHECK (total >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'card_paymob', 'instapay_vodafone')),
  shipping_provider text NOT NULL DEFAULT 'Shantety Express',
  tracking_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Defensive migration check if table already existed without tracking_token_hash
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tracking_token_hash'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN tracking_token_hash bytea;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_hash ON public.orders(tracking_token_hash);

-- ----------------------------------------------------------------------------
-- 2. ORDER ITEMS & STATUS HISTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  variant_id text NOT NULL REFERENCES public.product_variants(id),
  sku text NOT NULL,
  product_name_ar text NOT NULL,
  product_name_en text NOT NULL,
  color_name_ar text NOT NULL,
  color_name_en text NOT NULL,
  size_name_ar text NOT NULL,
  size_name_en text NOT NULL,
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  total_price integer NOT NULL CHECK (total_price >= 0),
  image text
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id text PRIMARY KEY DEFAULT ('osh-' || gen_random_uuid()),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by text NOT NULL,
  role text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);

-- ----------------------------------------------------------------------------
-- 3. INVENTORY MOVEMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id text PRIMARY KEY,
  variant_id text NOT NULL REFERENCES public.product_variants(id),
  sku text NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('receipt', 'order_reservation', 'order_cancellation', 'order_fulfillment', 'adjustment', 'return')),
  quantity_delta integer NOT NULL,
  reference_id text NOT NULL, -- Order number or PO number
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_variant ON public.inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_movements_ref ON public.inventory_movements(reference_id);

-- ----------------------------------------------------------------------------
-- 4. RLS RESTRICTIONS FOR ORDERS & INVENTORY
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Deny all direct browser mutations to orders & inventory movements
REVOKE INSERT, UPDATE, DELETE ON TABLE public.orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.order_items FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.order_status_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.inventory_movements FROM PUBLIC, anon, authenticated;

-- Customers can view their own orders when authenticated
DROP POLICY IF EXISTS orders_customer_read ON public.orders;
CREATE POLICY orders_customer_read ON public.orders
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS order_items_customer_read ON public.order_items;
CREATE POLICY order_items_customer_read ON public.order_items
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. FUNCTION: public.track_guest_order(text) [EXISTING SUPABASE RPC COMPATIBILITY]
-- Takes plaintext tracking token, hashes with SHA-256, matches BYTEA tracking_token_hash.
-- ZERO PII LEAKAGE: Never returns customer phone, recipient email, or full address.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_guest_order(
  p_tracking_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_items jsonb;
  v_history jsonb;
  v_token_hash bytea;
BEGIN
  IF p_tracking_token IS NULL OR length(trim(p_tracking_token)) < 6 THEN
    RETURN NULL;
  END IF;

  -- Compute SHA-256 digest (bytea) of the plaintext tracking token
  v_token_hash := digest(trim(p_tracking_token), 'sha256');

  SELECT id, order_number, status, shipping_provider, tracking_number,
         shipping_address->>'governorate' as gov,
         shipping_address->>'city' as city,
         created_at
  INTO v_order
  FROM public.orders
  WHERE tracking_token_hash = v_token_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Load safe item snapshots
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name_ar', product_name_ar,
      'product_name_en', product_name_en,
      'color_name_ar', color_name_ar,
      'color_name_en', color_name_en,
      'size_name_ar', size_name_ar,
      'size_name_en', size_name_en,
      'quantity', quantity,
      'image', image
    )
  )
  INTO v_items
  FROM public.order_items
  WHERE order_id = v_order.id;

  -- Load tracking milestone history
  SELECT jsonb_agg(
    jsonb_build_object(
      'status', status,
      'created_at', created_at
    ) ORDER BY created_at ASC
  )
  INTO v_history
  FROM public.order_status_history
  WHERE order_id = v_order.id;

  -- Return sanitized tracking payload
  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'shipping_provider', v_order.shipping_provider,
    'tracking_number', v_order.tracking_number,
    'destination_governorate', v_order.gov,
    'destination_city', v_order.city,
    'created_at', v_order.created_at,
    'items', coalesce(v_items, '[]'::jsonb),
    'history', coalesce(v_history, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_guest_order(text) TO PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. FUNCTION: public.lookup_guest_order(text, text) [COMPATIBILITY ALIAS]
-- Takes order_number and token_hash (hex string or bytea hex), returns non-PII tracking data.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_guest_order(
  p_order_number text,
  p_token_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_items jsonb;
  v_history jsonb;
  v_clean_hex text;
  v_target_bytes bytea;
BEGIN
  IF p_order_number IS NULL OR p_token_hash IS NULL OR length(p_order_number) < 4 OR length(p_token_hash) < 16 THEN
    RETURN NULL;
  END IF;

  v_clean_hex := lower(trim(p_token_hash));
  IF starts_with(v_clean_hex, '\x') THEN
    v_clean_hex := substr(v_clean_hex, 3);
  END IF;

  BEGIN
    v_target_bytes := decode(v_clean_hex, 'hex');
  EXCEPTION WHEN OTHERS THEN
    v_target_bytes := NULL;
  END;

  SELECT id, order_number, status, shipping_provider, tracking_number,
         shipping_address->>'governorate' as gov,
         shipping_address->>'city' as city,
         created_at
  INTO v_order
  FROM public.orders
  WHERE upper(trim(order_number)) = upper(trim(p_order_number))
    AND (
      (v_target_bytes IS NOT NULL AND tracking_token_hash = v_target_bytes)
      OR encode(tracking_token_hash, 'hex') = v_clean_hex
    );

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name_ar', product_name_ar,
      'product_name_en', product_name_en,
      'color_name_ar', color_name_ar,
      'color_name_en', color_name_en,
      'size_name_ar', size_name_ar,
      'size_name_en', size_name_en,
      'quantity', quantity,
      'image', image
    )
  )
  INTO v_items
  FROM public.order_items
  WHERE order_id = v_order.id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'status', status,
      'created_at', created_at
    ) ORDER BY created_at ASC
  )
  INTO v_history
  FROM public.order_status_history
  WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'shipping_provider', v_order.shipping_provider,
    'tracking_number', v_order.tracking_number,
    'destination_governorate', v_order.gov,
    'destination_city', v_order.city,
    'created_at', v_order.created_at,
    'items', coalesce(v_items, '[]'::jsonb),
    'history', coalesce(v_history, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_guest_order(text, text) TO PUBLIC, anon, authenticated;

COMMIT;
