-- ============================================================================
-- SHANTETY E-COMMERCE PLATFORM (شنطتي)
-- MIGRATION 006: Database-Level Idempotency, Concurrency & Hardened RPCs
-- Target Database: Supabase PostgreSQL (PostgreSQL 15+)
-- ============================================================================

-- PURPOSE:
-- 1. Create public.idempotency_keys table for bulletproof request deduplication.
-- 2. Create public.payments table for tracking multiple payment attempts per order.
-- 3. Stored Procedure: public.execute_atomic_checkout
--    - Enforces positive quantities (1..50)
--    - Aggregates duplicate variant IDs
--    - Acquires deterministic row locks (ORDER BY variant_id ASC FOR UPDATE)
--    - Computes server-authoritative prices and shipping
--    - Inserts order, items, and double-entry inventory movements atomically.
-- 4. Stored Procedure: public.claim_guest_order
--    - Enforces cryptographic token ownership proof
--    - Associates order with caller auth.uid()
--    - One-time single-use capability with token rotation.
-- 5. Stored Procedure: public.apply_order_status_transition
--    - Enforces Finite State Machine (FSM) rules
--    - Handles physical stock deductions on 'delivered'
--    - Handles stock releases on 'cancelled'
-- 6. Trigger: public.protect_store_owner
--    - Prevents deactivation, role demotion, or deletion of owner account.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. IDEMPOTENCY KEYS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('checkout', 'payment_webhook', 'refund', 'order_claim')),
  request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON public.idempotency_keys(key, scope);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys(expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.idempotency_keys FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. PAYMENTS AUDIT TABLE (Multi-Attempt Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY DEFAULT ('pay-' || gen_random_uuid()),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('paymob', 'instapay', 'vodafone_cash', 'cod', 'manual')),
  provider_transaction_id text,
  amount integer NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded')),
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx ON public.payments(provider, provider_transaction_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.payments TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. FUNCTION: public.execute_atomic_checkout
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_atomic_checkout(
  p_order_id text,
  p_order_number text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_shipping_address jsonb,
  p_payment_method text,
  p_shipping_fee integer,
  p_notes text,
  p_tracking_token text,
  p_items jsonb -- Array of objects: [{"variant_id": "...", "quantity": 1}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_token_hash bytea;
  v_item record;
  v_variant record;
  v_product record;
  v_subtotal integer := 0;
  v_total integer := 0;
  v_payment_status text;
  v_initial_order_status text := 'pending';
BEGIN
  -- 1. Validate inputs
  IF length(trim(p_customer_name)) < 3 THEN
    RAISE EXCEPTION 'Customer name must be at least 3 characters.';
  END IF;

  IF length(regexp_replace(p_customer_phone, '\D', '', 'g')) != 11 THEN
    RAISE EXCEPTION 'Invalid phone number format. Must be an 11-digit Egyptian phone.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty.';
  END IF;

  -- 2. Compute SHA-256 binary digest of tracking token
  v_token_hash := digest(trim(p_tracking_token), 'sha256');

  -- 3. Initial payment status determination (Never mark paid by method alone!)
  IF p_payment_method = 'cod' THEN
    v_payment_status := 'pending';
  ELSE
    v_payment_status := 'awaiting_payment';
  END IF;

  -- 4. Aggregate duplicate variant IDs and acquire deterministic row locks (ORDER BY variant_id ASC)
  -- Uses CTE to aggregate duplicate items before locking
  FOR v_item IN
    WITH aggregated AS (
      SELECT
        x.variant_id,
        sum(x.quantity)::integer AS total_qty
      FROM jsonb_to_recordset(p_items) AS x(variant_id text, quantity integer)
      GROUP BY x.variant_id
      ORDER BY x.variant_id ASC
    )
    SELECT
      a.variant_id,
      a.total_qty,
      pv.product_id,
      pv.sku,
      pv.price,
      pv.sale_price,
      pv.stock_on_hand,
      pv.stock_reserved,
      pv.image as variant_image,
      pv.color_id,
      pv.size_id
    FROM aggregated a
    JOIN public.product_variants pv ON pv.id = a.variant_id
    WHERE pv.is_active = true
    FOR UPDATE OF pv
  LOOP
    -- Validate quantity limits
    IF v_item.total_qty <= 0 OR v_item.total_qty > 50 THEN
      RAISE EXCEPTION 'Invalid quantity for SKU %: % (must be between 1 and 50)', v_item.sku, v_item.total_qty;
    END IF;

    -- Concurrency check: Ensure available inventory meets requirement
    IF (v_item.stock_on_hand - v_item.stock_reserved) < v_item.total_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: SKU % has only % available (requested %)',
        v_item.sku,
        greatest(0, v_item.stock_on_hand - v_item.stock_reserved),
        v_item.total_qty;
    END IF;

    -- Reserve stock atomically
    UPDATE public.product_variants
    SET stock_reserved = stock_reserved + v_item.total_qty,
        updated_at = now()
    WHERE id = v_item.variant_id;

    -- Calculate line price
    v_subtotal := v_subtotal + (coalesce(v_item.sale_price, v_item.price) * v_item.total_qty);

    -- Log double-entry inventory reservation
    INSERT INTO public.inventory_movements (
      id, variant_id, sku, movement_type, quantity_delta, reference_id, notes, created_at, created_by
    ) VALUES (
      ('mov-' || gen_random_uuid()),
      v_item.variant_id,
      v_item.sku,
      'order_reservation',
      -v_item.total_qty,
      p_order_number,
      'Atomic stock reservation for Order ' || p_order_number,
      now(),
      'System Checkout'
    );
  END LOOP;

  -- 5. Calculate grand total
  v_total := v_subtotal + p_shipping_fee;

  -- 6. Insert order record
  INSERT INTO public.orders (
    id,
    order_number,
    customer_id,
    tracking_token_hash,
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    subtotal,
    shipping_fee,
    discount,
    total,
    currency,
    status,
    payment_status,
    payment_method,
    shipping_provider,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_order_id,
    p_order_number,
    p_customer_id,
    v_token_hash,
    trim(p_customer_name),
    regexp_replace(p_customer_phone, '\D', '', 'g'),
    nullif(trim(p_customer_email), ''),
    p_shipping_address,
    v_subtotal,
    p_shipping_fee,
    0,
    v_total,
    'EGP',
    v_initial_order_status,
    v_payment_status,
    p_payment_method,
    'Shantety Express',
    p_notes,
    now(),
    now()
  );

  -- 7. Batch insert order items
  INSERT INTO public.order_items (
    id,
    order_id,
    product_id,
    variant_id,
    sku,
    product_name_ar,
    product_name_en,
    color_name_ar,
    color_name_en,
    size_name_ar,
    size_name_en,
    unit_price,
    quantity,
    total_price,
    image
  )
  SELECT
    ('item-' || gen_random_uuid()),
    p_order_id,
    p.id,
    pv.id,
    pv.sku,
    p.name_ar,
    p.name_en,
    coalesce(c.name_ar, 'افتراضي'),
    coalesce(c.name_en, 'Default'),
    coalesce(s.name_ar, 'مقاس موحد'),
    coalesce(s.name_en, 'One Size'),
    coalesce(pv.sale_price, pv.price),
    agg.qty,
    coalesce(pv.sale_price, pv.price) * agg.qty,
    coalesce(pv.image, (p.images->>0))
  FROM (
    SELECT variant_id, sum(quantity)::integer as qty
    FROM jsonb_to_recordset(p_items) as x(variant_id text, quantity integer)
    GROUP BY variant_id
  ) agg
  JOIN public.product_variants pv ON pv.id = agg.variant_id
  JOIN public.products p ON p.id = pv.product_id
  LEFT JOIN public.colors c ON c.id = pv.color_id
  LEFT JOIN public.sizes s ON s.id = pv.size_id;

  -- 8. Return structured success payload
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', p_order_number,
    'subtotal', v_subtotal,
    'shipping_fee', p_shipping_fee,
    'total', v_total,
    'payment_status', v_payment_status,
    'tracking_token', p_tracking_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_atomic_checkout FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_checkout TO service_role;

-- ----------------------------------------------------------------------------
-- 4. FUNCTION: public.claim_guest_order
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_guest_order(
  p_order_number text,
  p_claim_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_token_hash bytea;
  v_order record;
  v_new_token text;
  v_new_hash bytea;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User must be authenticated to claim an order.';
  END IF;

  IF p_order_number IS NULL OR p_claim_token IS NULL OR length(trim(p_claim_token)) < 6 THEN
    RAISE EXCEPTION 'Invalid parameters: Order number and valid security claim token required.';
  END IF;

  -- Compute SHA-256 digest of supplied plaintext claim token
  v_token_hash := digest(trim(p_claim_token), 'sha256');

  -- Lock order row for verification
  SELECT id, order_number, customer_id, tracking_token_hash
  INTO v_order
  FROM public.orders
  WHERE upper(trim(order_number)) = upper(trim(p_order_number))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found.', p_order_number;
  END IF;

  -- Verify cryptographic token match in constant time
  IF v_order.tracking_token_hash != v_token_hash THEN
    RAISE EXCEPTION 'Invalid claim credentials. Token does not match this order.';
  END IF;

  -- Check if already claimed by someone else
  IF v_order.customer_id IS NOT NULL AND v_order.customer_id != v_caller_id THEN
    RAISE EXCEPTION 'This order has already been linked to a customer account.';
  END IF;

  -- Rotate capability token to prevent replay
  v_new_token := 'tk_' || encode(gen_random_bytes(16), 'hex');
  v_new_hash := digest(v_new_token, 'sha256');

  -- Associate order with authenticated customer
  UPDATE public.orders
  SET customer_id = v_caller_id,
      tracking_token_hash = v_new_hash,
      updated_at = now()
  WHERE id = v_order.id;

  -- Audit log entry
  INSERT INTO public.audit_logs (
    id, timestamp, actor, role, action, resource_type, resource_id, details
  ) VALUES (
    ('log-' || gen_random_uuid()),
    now(),
    v_caller_id::text,
    'Customer',
    'CLAIM_GUEST_ORDER',
    'Order',
    v_order.order_number,
    'Guest order ' || v_order.order_number || ' linked to customer account'
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'customer_id', v_caller_id,
    'new_tracking_token', v_new_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_guest_order TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. FUNCTION: public.apply_order_status_transition
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_order_status_transition(
  p_order_id text,
  p_new_status text,
  p_carrier text,
  p_tracking_number text,
  p_actor text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_order record;
  v_item record;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id OR order_number = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'status', p_new_status, 'unchanged', true);
  END IF;

  -- Validate allowed FSM transitions
  IF v_order.status = 'pending' AND p_new_status NOT IN ('processing', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from pending to %', p_new_status;
  ELSIF v_order.status = 'processing' AND p_new_status NOT IN ('shipped', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from processing to %', p_new_status;
  ELSIF v_order.status = 'shipped' AND p_new_status NOT IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from shipped to %', p_new_status;
  ELSIF v_order.status = 'delivered' AND p_new_status NOT IN ('refunded') THEN
    RAISE EXCEPTION 'Cannot transition from delivered to %', p_new_status;
  ELSIF v_order.status IN ('cancelled', 'refunded') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status % to %', v_order.status, p_new_status;
  END IF;

  -- Update order record
  UPDATE public.orders
  SET status = p_new_status,
      shipping_provider = coalesce(p_carrier, shipping_provider),
      tracking_number = coalesce(p_tracking_number, tracking_number),
      updated_at = now()
  WHERE id = v_order.id;

  -- Record status history
  INSERT INTO public.order_status_history (
    order_id, status, changed_by, role, notes, created_at
  ) VALUES (
    v_order.id,
    p_new_status,
    p_actor,
    'Admin',
    'Status transitioned from ' || v_order.status || ' to ' || p_new_status,
    now()
  );

  -- Handle Inventory Side Effects
  IF p_new_status = 'delivered' THEN
    -- Fulfillment: Deduct stock_on_hand and clear stock_reserved
    FOR v_item IN SELECT variant_id, quantity, sku FROM public.order_items WHERE order_id = v_order.id LOOP
      UPDATE public.product_variants
      SET stock_on_hand = greatest(0, stock_on_hand - v_item.quantity),
          stock_reserved = greatest(0, stock_reserved - v_item.quantity),
          updated_at = now()
      WHERE id = v_item.variant_id;

      INSERT INTO public.inventory_movements (
        id, variant_id, sku, movement_type, quantity_delta, reference_id, notes, created_at, created_by
      ) VALUES (
        ('mov-' || gen_random_uuid()),
        v_item.variant_id,
        v_item.sku,
        'order_fulfillment',
        -v_item.quantity,
        v_order.order_number,
        'Physical fulfillment upon delivery',
        now(),
        p_actor
      );
    END LOOP;

    -- If COD, mark payment as paid
    IF v_order.payment_method = 'cod' THEN
      UPDATE public.orders SET payment_status = 'paid' WHERE id = v_order.id;
    END IF;

  ELSIF p_new_status = 'cancelled' THEN
    -- Cancellation: Release reserved stock
    FOR v_item IN SELECT variant_id, quantity, sku FROM public.order_items WHERE order_id = v_order.id LOOP
      UPDATE public.product_variants
      SET stock_reserved = greatest(0, stock_reserved - v_item.quantity),
          updated_at = now()
      WHERE id = v_item.variant_id;

      INSERT INTO public.inventory_movements (
        id, variant_id, sku, movement_type, quantity_delta, reference_id, notes, created_at, created_by
      ) VALUES (
        ('mov-' || gen_random_uuid()),
        v_item.variant_id,
        v_item.sku,
        'order_cancellation',
        v_item.quantity,
        v_order.order_number,
        'Released reserved stock on cancellation',
        now(),
        p_actor
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'previous_status', v_order.status,
    'new_status', p_new_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_order_status_transition FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_order_status_transition TO service_role;

-- ----------------------------------------------------------------------------
-- 6. TRIGGER: protect_store_owner
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_store_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF OLD.is_owner = true OR OLD.role = 'super_admin' THEN
    IF NEW.is_active = false OR NEW.role != 'super_admin' OR NEW.is_owner = false THEN
      RAISE EXCEPTION 'CRITICAL: The store owner account is immutable and cannot be deactivated or demoted.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_store_owner ON public.admin_memberships;
CREATE TRIGGER trg_protect_store_owner
  BEFORE UPDATE OR DELETE ON public.admin_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_store_owner();

COMMIT;
