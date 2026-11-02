-- ============================================================================
-- SHANTETY E-COMMERCE PLATFORM (شنطتي)
-- POST-MIGRATION VERIFICATION SUITE
-- Target Database: Supabase PostgreSQL
-- ============================================================================

-- 1. Verify all 13 core tables exist
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'admin_memberships',
    'customer_profiles',
    'customer_addresses',
    'categories',
    'brands',
    'colors',
    'sizes',
    'products',
    'product_variants',
    'orders',
    'order_items',
    'order_status_history',
    'inventory_movements',
    'suppliers',
    'purchase_orders',
    'purchase_order_items',
    'audit_logs',
    'reviews'
  )
ORDER BY table_name;

-- 2. Verify RLS is enabled on all tables
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname IN (
    'admin_memberships',
    'customer_profiles',
    'customer_addresses',
    'products',
    'product_variants',
    'orders',
    'order_items',
    'order_status_history',
    'inventory_movements',
    'audit_logs'
  );

-- 3. Verify column-level privileges on product_variants (stock_on_hand and stock_reserved must NOT be readable by public/anon)
SELECT table_name, column_name, privilege_type, grantee
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'product_variants'
  AND column_name IN ('stock_on_hand', 'stock_reserved')
  AND grantee IN ('PUBLIC', 'anon');
-- EXPECTED: 0 rows returned!

-- 4. Verify manage_admin_membership function definition & security definer status
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'manage_admin_membership';
-- EXPECTED: prosecdef = true, proconfig contains search_path

-- 5. Verify orders.tracking_token_hash data type is BYTEA
SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name = 'tracking_token_hash';
-- EXPECTED: data_type = 'bytea'

-- 6. Verify track_guest_order and lookup_guest_order functions exist and are SECURITY DEFINER
SELECT proname, prosecdef, proconfig, pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('track_guest_order', 'lookup_guest_order')
  AND pronamespace = 'public'::regnamespace;
-- EXPECTED: prosecdef = true for both functions

-- 7. Verify manage_admin_membership signature (uuid, text, boolean) and owner protection
SELECT proname, prosecdef, pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'manage_admin_membership'
  AND pronamespace = 'public'::regnamespace;
-- EXPECTED: arguments = 'target_user_id uuid, new_role text, new_status boolean', prosecdef = true

-- 8. Check that direct browser write privileges are revoked from audit_logs
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');
-- EXPECTED: 0 rows returned!

