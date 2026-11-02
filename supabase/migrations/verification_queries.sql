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

-- 5. Verify lookup_guest_order function exists and is security definer
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'lookup_guest_order';
-- EXPECTED: prosecdef = true

-- 6. Check that direct browser write privileges are revoked from audit_logs
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');
-- EXPECTED: 0 rows returned!
