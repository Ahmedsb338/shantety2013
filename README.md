# SHANTETY (شنطتي) — E-COMMERCE PLATFORM

> Official production-ready e-commerce platform for Shantety (شنطتي) — Egyptian brand for handcrafted women's bags, ergonomic footwear, and fashion accessories.
> **Domain**: [https://shantety.shop](https://shantety.shop)  
> **Hotline / WhatsApp**: +201010070812  
> **Official Email**: shantety2013@gmail.com

---

## 1. ARCHITECTURE OVERVIEW

The Shantety platform has been reconstructed into a server-authoritative e-commerce system migrated to Supabase PostgreSQL and Cloudflare Workers:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS with full bilingual (Arabic/English) RTL/LTR support.
- **Backend API Layer**: Trusted server API routes (`/api/*`) executing in Node.js Express (`server.ts`) for local development and full-stack runtime, and Cloudflare Worker (`worker/index.ts`) for edge deployment.
- **Database**: Supabase PostgreSQL as the authoritative single source of truth.
- **Authentication**: Supabase Auth (email/password) for customers and administrators, with server-side role verification (`super_admin`, `store_manager`, `order_staff`).
- **Security & Inventory**: Row-level locking for atomic inventory reservations (`stock_reserved`), SHA-256 guest tracking token hashing (plaintext tokens are never stored), and strict privilege revocation from browser clients.

---

## 2. SECURITY HARDENING MEASURES

1. **Server-Authoritative Pricing & Checkout**:
   - Cart item prices submitted by the browser are discarded. Unit prices, sale prices, subtotal, and governorate shipping rates are calculated strictly from database values.
   - Atomically verifies that `stock_on_hand - stock_reserved >= requested_quantity` before reserving stock.
   - Prevents overselling, negative quantities, and duplicate order submissions.

2. **Cryptographic Tracking Token Hashing**:
   - Secure tracking tokens (`tk_...`) are generated using cryptographically strong random bytes.
   - The token is hashed with SHA-256 before storing `tracking_token_hash` in the database.
   - The plaintext token is returned only once to the customer in the checkout confirmation.
   - The guest tracking endpoint (`/api/orders/track`) verifies the SHA-256 hash in constant time, rate-limits attempts (10 requests/min), and returns sanitized logistics data without PII (no customer phone, email, full address, or internal notes).

3. **Database Privilege & RLS Restrictions**:
   - Direct write privileges on `orders`, `order_items`, `inventory_movements`, `admin_memberships`, and `audit_logs` are revoked from `PUBLIC`, `anon`, and `authenticated` browser roles.
   - Safe column-level grants on `product_variants` expose SKU, color, size, price, and active status, while `stock_on_hand` and `stock_reserved` are omitted from public browser access.
   - Owner protection: the store owner membership cannot be demoted, deactivated, or modified via `manage_admin_membership`.

4. **Zero Hardcoded Secrets or Passkeys**:
   - Insecure master passcodes and static client-side email lists have been removed.
   - Privileged credentials (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) are strictly kept server-side and excluded from Git.

---

## 3. SUPABASE MIGRATION PACKAGE

Numbered SQL migrations are provided in `/supabase/migrations/`:

| Migration File | Description |
| :--- | :--- |
| `001_initial_schema_and_security.sql` | Core schema (`admin_memberships`, `customer_profiles`, `customer_addresses`, `products`, `product_variants`, `suppliers`, `purchase_orders`), column-level security, and `public.manage_admin_membership` SECURITY DEFINER function. |
| `002_tracking_hash_and_atomic_checkout.sql` | `orders` table with SHA-256 `tracking_token_hash`, `order_items`, `order_status_history`, `inventory_movements`, and `public.lookup_guest_order` sanitized procedure. |
| `003_audit_integrity_and_role_grants.sql` | `audit_logs` table, privilege revocations for browser roles, reviews table, and search path hardening. |
| `verification_queries.sql` | Verification queries to confirm RLS, column grants, functions, and table structures in Supabase SQL Editor. |

---

## 4. ENVIRONMENT VARIABLES

Copy `.env.example` to `.env.local` for development:

```bash
# Public variables (exposed to browser client)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_URL=https://shantety.shop

# Server-only secrets (Never prefix with VITE_ and never commit to Git)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
DATABASE_URL=postgresql://postgres.your-project-ref:your-db-password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
GEMINI_API_KEY=your-gemini-api-key
PORT=3000
```

---

## 5. LOCAL RUN & TESTING

```bash
# Install dependencies
npm install

# Run TypeScript type check
npm run check

# Run automated security and business rules test suite
npm test

# Build client and server bundles
npm run build

# Start local server (http://0.0.0.0:3000)
npm run dev
```

---

## 6. CLOUDFLARE DEPLOYMENT

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy

# Set server-side secrets in Cloudflare
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put GEMINI_API_KEY
```
