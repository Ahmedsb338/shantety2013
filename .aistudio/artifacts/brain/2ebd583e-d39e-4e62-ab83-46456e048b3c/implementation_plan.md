# SHANTETY — FINAL ARCHITECTURE SAFETY CORRECTIONS & ACCEPTANCE SPECIFICATION

**Project:** Shantety (شنطتي) — Egyptian Luxury Handbags & Footwear  
**Production Domain:** `https://shantety.shop`  
**Cloudflare Worker:** `shantety2013`  
**Authoritative Supabase Project:** `https://mziomwhluwjtadchnxdz.supabase.co`  
**Review Scope:** Final Architecture, Security Hardening, and Acceptance Specification  
**Execution Mode:** **STRICTLY READ-ONLY**  
**Document Authority:** Shantety Project Owner  

---

## 1. Mandatory Execution Boundary & Current Authority

This document is strictly an architectural safety review, technical specification, and evidence-based repository audit.

### Explicit Execution Prohibitions Enforced:
- **NO** editing, creating, deleting, or formatting project code files.
- **NO** executing SQL queries, stored procedures, or DDL scripts against any database.
- **NO** applying, modifying, or deleting database migrations.
- **NO** changing database records, schemas, column privileges, grants, or Row Level Security (RLS) policies.
- **NO** configuring Cloudflare variables, bindings, or encrypted secrets.
- **NO** deploying or redeploying any preview, staging, or production environment.
- **NO** committing, pushing, branching, or altering Git history.
- **NO** performing live financial transactions, simulated checkouts, or test purchases.
- **NO** claims that proposed architectural changes have been implemented or tested in production.

### Final Governance Status:
- **Architecture Status:** **ARCHITECTURE CONDITIONAL** (Pending owner resolution of open cryptographic and identity questions).
- **Implementation Status:** **IMPLEMENTATION NOT AUTHORIZED**.
- **Database Migrations:** **PRODUCTION MIGRATIONS NOT AUTHORIZED**.
- **Cloudflare Secrets:** **PRODUCTION SECRETS NOT AUTHORIZED**.
- **Production Deployment:** **PRODUCTION DEPLOYMENT NOT AUTHORIZED**.

---

## 2. Required Evidence Classification Taxonomy

Every technical statement and audit item in this specification is categorized according to strict evidence tiers:

| Evidence Tier | Definition | Standard of Proof |
| :--- | :--- | :--- |
| **VERIFIED IN REPOSITORY** | Confirmed by inspecting source code files, configuration files, or local SQL files in the workspace. | Exact file path, line numbers, and function/table name provided. |
| **VERIFIED IN LIVE ENVIRONMENT** | Confirmed by direct HTTP probe or authoritative live infrastructure query. | HTTP response payload, status code, timestamp, and target URI provided. |
| **PROPOSED — NOT IMPLEMENTED** | Required target architecture, schema, or security control designed in this document. | Explicitly labeled as target design; zero code or SQL currently exists in runtime. |
| **UNVERIFIED** | Stated in documentation or tickets but lacks empirical proof in code or runtime. | Must be proven before execution. |
| **BLOCKED** | Cannot proceed due to missing prerequisite credentials, migrations, or upstream systems. | Specific blocker condition documented. |
| **NOT AUTHORIZED** | Prohibited from execution under current mandate. | Strict read-only boundary enforced. |

---

## 3. Server-Authoritative Payment Integrity

### 3.1 Payment Integrity Principles
1. **Selection Is Not Payment:** Selecting a payment method (e.g., Paymob Card, InstaPay, Cash on Delivery) at checkout **MUST NEVER** initialize or mark an order as `paid`.
2. **Decoupled Entities:** Order creation and payment processing are distinct operations. An order can exist in `pending` status while payment is `awaiting_payment`.
3. **Browser Redirects Are Untrusted:** Browser success redirects (e.g., `/checkout/success?status=success`) and client-side query parameters are treated as completely unverified user signals, **never as payment confirmation**.
4. **Authoritative Confirmation:** Payment confirmation must originate exclusively from:
   - A cryptographically verified server-to-server webhook notification from the payment gateway.
   - An independent, server-initiated inquiry to the payment gateway's transaction inquiry API using server-held credentials.
   - Physical courier cash reconciliation for Cash on Delivery (`cod`).

### 3.2 Distinct Payment Status States
The application must never conflate order logistical status (`status`) with payment financial status (`payment_status`).
```
[ Payment Status Lifecycle ]
   ├── pending: Initial state for COD (cash awaiting collection upon physical delivery).
   ├── awaiting_payment: Initial state for electronic payments (Paymob card, mobile wallets, InstaPay).
   ├── paid: Authenticated cryptographic proof of captured funds received from provider.
   ├── failed: Payment gateway rejected transaction or 3D Secure authentication failed.
   ├── expired: Electronic payment session window (30 minutes) elapsed without successful payment.
   ├── cancelled: Customer or administrator aborted the transaction before capture.
   ├── partially_refunded: A portion of captured funds returned to customer.
   └── refunded: 100% of captured funds returned to customer.
```

### 3.3 Paymob Integration & Verification Protocol
- **Implementation Status:** **PROPOSED — NOT IMPLEMENTED**. (Repository currently has mock/in-memory payment handling; no Paymob SDK or webhook handler is mounted).
- **Callback Verification Specification:**
  1. Paymob transmits transaction callbacks via HTTP POST or GET to `/api/webhooks/paymob`.
  2. The payload contains transaction parameters: `amount_cents`, `created_at`, `currency`, `error_occured`, `has_parent_transaction`, `id` (Paymob transaction ID), `integration_id`, `is_3d_secure`, `is_auth`, `is_capture`, `is_refunded`, `is_standalone_payment`, `is_voided`, `order` (Paymob internal order ID), `owner`, `pending`, `source_data.pan`, `source_data.sub_type`, `source_data.type`, `success`.
  3. **HMAC Calculation:** The server extracts values in exact lexicographical parameter order specified by Paymob documentation, concatenates them into a single string, and computes `HMAC-SHA512(concatenated_string, PAYMOB_HMAC_SECRET)`.
  4. **Constant-Time Verification:** The server compares the computed HMAC against the incoming `hmac` parameter using `crypto.timingSafeEqual` to prevent timing attacks.
  5. **Validation Invariants:**
     - `currency` must strictly equal `'EGP'`.
     - `amount_cents` must strictly equal `orders.total * 100`.
     - `order_id` in Paymob `merchant_order_id` must match a valid `orders.order_number`.
     - `success` must strictly equal `true`.
     - `is_voided` must be `false`; `error_occured` must be `false`.
  6. **Distinction Between Payment Stages:**
     - **Initiation:** Paymob authentication token generated; order placed in `awaiting_payment`.
     - **Authorization (`is_auth = true`, `is_capture = false`):** Funds held on customer card; not settled.
     - **Capture / Settlement (`is_capture = true`, `success = true`):** Funds finalized. Only upon capture is `orders.payment_status` updated to `'paid'`.

---

## 4. Inventory Integrity & Transactional Atomic Checkout

### 4.1 Transactional Checkout Protocol Invariants
- **Implementation Status:** **PROPOSED — NOT IMPLEMENTED** in PostgreSQL stored procedure. (Currently in `src/server/commerceService.ts` lines 390–614 as in-memory JavaScript array mutation).
- **Mandatory Server Validation Rules:**
  1. **Quantity Constraints:** Reject any line item where `quantity <= 0`, `quantity > 50`, or `quantity !== Math.floor(quantity)`.
  2. **Duplicate Variant Aggregation:** If a cart payload contains duplicate entries for the same variant ID (e.g. `[{ variant_id: "v1", qty: 2 }, { variant_id: "v1", qty: 1 }]`), the server must aggregate them into a single requirement of 3 units before acquiring locks.
  3. **Purchasability Verification:** Verify that `products.is_active = true` AND `product_variants.is_active = true`. Inactive or archived items must fail checkout immediately with a clear bilingual error.
  4. **Server-Authoritative Pricing:** Completely ignore client-submitted `unit_price`, `subtotal`, and `total`. Read unit prices directly from the locked `product_variants` database row (`COALESCE(sale_price, price)`).
  5. **Server-Authoritative Shipping Fees:** Look up shipping fee from authoritative governorate schedule. Apply free-shipping threshold (1,000 EGP) server-side.
  6. **Deterministic Row-Lock Ordering:** Variant IDs must be sorted alphabetically (`ORDER BY variant_id ASC`) before issuing `SELECT ... FOR UPDATE` to guarantee **zero database deadlocks** during high-concurrency flash sales.
  7. **Atomic Transaction Boundary:** Order insertion, order items creation, inventory reservation, and inventory movement logging must execute in a single atomic PostgreSQL transaction (`BEGIN ... COMMIT`). If any constraint fails, the entire transaction rolls back.

### 4.2 Complete Stock & Reservation Lifecycle
```
[ Stock Model Equation ]
Physical Stock On Hand = stock_on_hand
Reserved Stock         = stock_reserved
Available to Sell      = stock_on_hand - stock_reserved
```

| Lifecycle Event | Trigger / Condition | Database Action on `product_variants` | `inventory_movements` Entry | Audit Event |
| :--- | :--- | :--- | :--- | :--- |
| **Checkout Created** | Valid atomic checkout submitted. | `stock_reserved = stock_reserved + qty` | `movement_type = 'order_reservation'`, `quantity_delta = -qty`, `ref = order_number` | `CHECKOUT_RESERVED` |
| **Reservation Expired** | Electronic payment unpaid after 30 min. | `stock_reserved = stock_reserved - qty` | `movement_type = 'order_cancellation'`, `quantity_delta = +qty`, `notes = 'Reservation timeout'` | `RESERVATION_EXPIRED` |
| **Payment Failed / Aborted** | Gateway webhook reports failure or cancel. | `stock_reserved = stock_reserved - qty` | `movement_type = 'order_cancellation'`, `quantity_delta = +qty`, `notes = 'Payment rejected'` | `PAYMENT_FAILED_RELEASE` |
| **Customer / Admin Cancel** | Order cancelled prior to physical dispatch. | `stock_reserved = stock_reserved - qty` | `movement_type = 'order_cancellation'`, `quantity_delta = +qty`, `notes = 'Order cancelled'` | `ORDER_CANCELLED` |
| **Order Shipped** | Package leaves warehouse with courier. | No stock change (`stock_reserved` holds allocation). | None | `ORDER_SHIPPED` |
| **Order Delivered** | Courier confirms handover (or COD cash collected). | `stock_on_hand = stock_on_hand - qty`<br>`stock_reserved = stock_reserved - qty` | `movement_type = 'order_fulfillment'`, `quantity_delta = -qty`, `notes = 'Delivered to customer'` | `ORDER_FULFILLED` |
| **Delivery Refused / Returned**| Package undelivered; returns to warehouse. | `stock_reserved = stock_reserved - qty` | `movement_type = 'order_cancellation'`, `quantity_delta = +qty`, `notes = 'Undelivered return'` | `DELIVERY_FAILED_RESTOCK` |
| **Delivered Item Return (Inspected)** | Customer returns item; physical QC passes. | `stock_on_hand = stock_on_hand + qty` | `movement_type = 'return'`, `quantity_delta = +qty`, `notes = 'QC Passed Restock'` | `RETURN_RESTOCKED` |
| **Financial Refund (No Physical Return)**| Damaged in transit or goodwill refund. | **NO STOCK RESTOCKING**. Physical item was not recovered. | None | `REFUND_NO_RESTOCK` |

---

## 5. Database-Level Idempotency Specification

### 5.1 Architecture & Schema
- **Implementation Status:** **PROPOSED — NOT IMPLEMENTED**.
- **Target Schema:**
```sql
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
CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON public.idempotency_keys(expires_at);
```

### 5.2 Idempotency Operational Rules
1. **Fingerprint Computation:** The server computes `request_hash = encode(digest(canonical_json(req.body), 'sha256'), 'hex')`.
2. **Key Lifecycle & Concurrency:**
   - Execute `SELECT * FROM public.idempotency_keys WHERE key = :key AND scope = :scope FOR UPDATE;`
   - **Scenario 1 (New Key):** Insert row with `status = 'processing'`. Execute operation. Upon success, update `status = 'completed'`, `response_status = 201`, `response_body = <sanitized_order_payload>`.
   - **Scenario 2 (Identical Retry):** If `status = 'completed'` AND `request_hash === incoming_hash`: Return cached `response_body` with `response_status` and HTTP header `Idempotency-Replay: true`.
   - **Scenario 3 (Payload Mismatch):** If `status = 'completed'` AND `request_hash !== incoming_hash`: Return **HTTP 409 Conflict** (`"Idempotency key reused with modified request payload"`).
   - **Scenario 4 (In-Flight Request):** If `status = 'processing'`: Return **HTTP 425 Too Early** or **HTTP 409 Conflict** (`"A transaction with this idempotency key is currently processing"`).
3. **Retention & Financial Reconciliation:** Records in `idempotency_keys` expire after 24 hours. Cleanup runs via daily scheduled job. Crucially, the underlying `orders`, `order_items`, and `audit_logs` records are permanent and never deleted during cleanup.

---

## 6. Cryptographic Guest Order Claiming Protocol

### 6.1 Vulnerability of Unverified Account Association
Associating guest orders with a customer account based solely on matching email addresses exposes customers to account takeover: if a malicious user creates an account using a victim's email, or if a typo occurs, order history, shipping addresses, and mobile numbers would leak.

### 6.2 Secure Claiming Protocol Specification
```
[ Guest Order Creation ]
   ├── Stored in DB: customer_id = NULL
   ├── Cryptographic Claim Capability: high-entropy secret token (tk_32hex)
   ├── Stored in DB: tracking_token_hash = digest(trim(token), 'sha256') (BYTEA)
   └── Plaintext token displayed ONCE to guest on OrderConfirmationPage.
```

- **Claiming Endpoint:** `POST /api/orders/claim`
- **Required Headers:** `Authorization: Bearer <verified_customer_supabase_jwt>`
- **Request Payload:** `{ "order_number": "SHN-XXXX", "claim_token": "tk_..." }`
- **Verification Workflow:**
  1. Server verifies caller's Bearer JWT using Supabase Auth -> obtains verified `customer_id = user.id`.
  2. Server verifies caller has confirmed email in `auth.users.email_confirmed_at`.
  3. Stored Procedure `public.claim_guest_order(p_order_number, p_claim_token)`:
     - Locks order row: `SELECT * FROM public.orders WHERE order_number = p_order_number FOR UPDATE;`
     - Validates order state: `IF orders.customer_id IS NOT NULL THEN RAISE EXCEPTION 'ORDER_ALREADY_CLAIMED';`
     - Computes token digest: `v_hash := digest(trim(p_claim_token), 'sha256');`
     - Constant-time verification: `IF orders.tracking_token_hash != v_hash THEN RAISE EXCEPTION 'INVALID_CLAIM_TOKEN';`
     - Associating order: `UPDATE public.orders SET customer_id = auth.uid(), updated_at = now() WHERE id = v_order.id;`
     - **Capability Invalidation / Rotation:** Rotates `tracking_token_hash` to a newly generated hash to ensure single-use capability.
     - Logs audit trail: `Actor: auth.uid()`, `Action: CLAIM_GUEST_ORDER`, `Resource: order_number`.
  4. **Preservation Guarantee:** If a user registers for an account during checkout and registration fails (e.g., password criteria not met or confirmation email pending), the order remains safely confirmed as a guest order with its claim capability intact.

---

## 7. Privileged RPC & Database Function Security Matrix

All database functions are audited or specified with strict search paths, ownership, and execution privileges:

| Function Name | Security Model | Owner | Allowed Callers | Required Identity Context | `search_path` | Proposed Grants / Revocations | Current Evidence Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`manage_admin_membership`** | `SECURITY DEFINER` | `postgres` | `authenticated` (Store Owner Only) | Verified `auth.uid()` matching owner UUID | `pg_catalog, public, auth` | `REVOKE ALL FROM PUBLIC, anon;`<br>`GRANT EXECUTE TO authenticated;` | **VERIFIED IN REPOSITORY** (`001_initial_schema_and_security.sql` lines 234–299) |
| **`track_guest_order`** | `SECURITY DEFINER` | `postgres` | `anon`, `authenticated`, `service_role` | Plaintext token parameter | `pg_catalog, public` | `REVOKE ALL FROM PUBLIC;`<br>`GRANT EXECUTE TO anon, authenticated, service_role;` | **VERIFIED IN REPOSITORY** (`002_tracking_hash_and_atomic_checkout.sql` lines 145–222) |
| **`lookup_guest_order`** | `SECURITY DEFINER` | `postgres` | `anon`, `authenticated`, `service_role` | Order number + token hash parameters | `pg_catalog, public` | `REVOKE ALL FROM PUBLIC;`<br>`GRANT EXECUTE TO anon, authenticated, service_role;` | **VERIFIED IN REPOSITORY** (`002_tracking_hash_and_atomic_checkout.sql` lines 228–315) |
| **`execute_atomic_checkout`** | `SECURITY DEFINER` | `postgres` | `service_role` (Worker Backend Only) | Validated server context + verified customer ID | `pg_catalog, public` | `REVOKE ALL FROM PUBLIC, anon, authenticated;`<br>`GRANT EXECUTE TO service_role;` | **PROPOSED — NOT IMPLEMENTED** in PostgreSQL |
| **`apply_order_status_transition`** | `SECURITY DEFINER` | `postgres` | `service_role` (Worker Backend Only) | Verified admin UID passed via server header | `pg_catalog, public` | `REVOKE ALL FROM PUBLIC, anon, authenticated;`<br>`GRANT EXECUTE TO service_role;` | **PROPOSED — NOT IMPLEMENTED** in PostgreSQL |
| **`claim_guest_order`** | `SECURITY DEFINER` | `postgres` | `authenticated` (Verified Customer) | Caller `auth.uid()` | `pg_catalog, public` | `REVOKE ALL FROM PUBLIC, anon;`<br>`GRANT EXECUTE TO authenticated;` | **PROPOSED — NOT IMPLEMENTED** in PostgreSQL |
| **`protect_store_owner`** | `SECURITY DEFINER` (Trigger) | `postgres` | Database engine trigger | `OLD` vs `NEW` record inspection | `pg_catalog, public` | Executed exclusively by database trigger on `admin_memberships` | **PROPOSED — NOT IMPLEMENTED** |

- **Audit Attribution Rule:** When execution occurs through `service_role` (Cloudflare Worker backend), `auth.uid()` evaluates to `NULL`. The Worker **must explicitly pass the verified administrator's identity and IP** into the RPC arguments to ensure accurate audit trail logging in `audit_logs`.

---

## 8. Immutable Store Owner Identity Protection

### 8.1 Vulnerability of Email-Based Identity
Emails can change, be spoofed in edge proxies, or be re-created in identity providers. Identifying the store owner by `shantety2013@gmail.com` in application code is an architectural flaw.

### 8.2 Target Owner Identity Architecture
1. **Primary Owner Identifier:** An immutable Supabase Auth UUID (`auth.users.id`).
2. **Current Evidence Status:** **UNVERIFIED**.
   - *Repository Evidence:* In `src/server/commerceService.ts` line 269, the mock data uses placeholder `'owner-uuid-1'`.
   - *Live Production Evidence:* The live UUID for `shantety2013@gmail.com` in `mziomwhluwjtadchnxdz.supabase.co` is **UNVERIFIED** because live database credentials have not been provided or queried.
3. **Protected Bootstrap Process:**
   - On initial migration, the owner membership must be seeded linking the real `auth.users.id` with `role = 'super_admin'`, `is_owner = true`, `is_active = true`.
4. **Database-Level Immutability Trigger:**
   - A PostgreSQL trigger on `public.admin_memberships` intercepts all `UPDATE` and `DELETE` queries.
   - If `OLD.is_owner = true`, any attempt to set `is_active = false`, `role != 'super_admin'`, or delete the record raises an immediate exception (`RAISE EXCEPTION 'Store owner account is immutable'`).
5. **Account Recovery Procedure:**
   - If the owner account is compromised or lost, ownership transfer requires direct database console access by the project administrator executing a multi-signature migration script that logs the transfer in `audit_logs`.

---

## 9. Cloudflare Configuration Matrix & Secrets Isolation

### 9.1 Variable & Secret Separation

| Variable / Secret Identifier | Environment | Target Location | Scope | Security Level | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`VITE_SUPABASE_URL`** | Vite Frontend Build | Cloudflare Pages / `.env` | Client / Browser | **PUBLIC** | Supabase REST endpoint for browser client SDK. |
| **`VITE_SUPABASE_ANON_KEY`** | Vite Frontend Build | Cloudflare Pages / `.env` | Client / Browser | **PUBLIC** | Anonymous JWT key for client authentication and public catalog reads adhering to RLS. |
| **`SUPABASE_URL`** | Cloudflare Worker Runtime | `wrangler.toml` vars | Server-Only | **INTERNAL** | Worker backend PostgREST endpoint. |
| **`SUPABASE_ANON_KEY`** | Cloudflare Worker Runtime | `wrangler.toml` vars | Server-Only | **INTERNAL** | Standard Worker client key. |
| **`SUPABASE_SERVICE_ROLE_KEY`**| Cloudflare Worker Runtime | Cloudflare Encrypted Secret (`wrangler secret put`) | Server-Only | **RESTRICTED SECRET** | High-privilege administrative key with RLS bypass. **NEVER EXPOSED TO BROWSER**. |
| **`PAYMOB_API_KEY`** | Cloudflare Worker Runtime | Cloudflare Encrypted Secret (`wrangler secret put`) | Server-Only | **RESTRICTED SECRET** | Secret API key for Paymob server-to-server transaction inquiries. |
| **`PAYMOB_HMAC_SECRET`** | Cloudflare Worker Runtime | Cloudflare Encrypted Secret (`wrangler secret put`) | Server-Only | **RESTRICTED SECRET** | Shared secret for verifying Paymob webhook HMAC-SHA512 signatures. |
| **`ENVIRONMENT`** | Cloudflare Worker Runtime | `wrangler.toml` vars | Server-Only | **CONFIGURATION** | Explicit environment flag: `"production"` or `"staging"`. |
| **`ALLOW_DEV_MOCKS`** | Cloudflare Worker Runtime | `wrangler.toml` vars | Server-Only | **CONFIGURATION** | Must strictly evaluate to `"false"` in production. |

### 9.2 Production Environment Detection & Fail-Closed Behavior
- **Evidence in Repository:** `src/server/supabaseBackend.ts` lines 76–140 (`getBackendReadiness`).
- **Production Detection Rule:** Do not rely on `NODE_ENV` alone (often defaulted to `development` by bundling tools). Production status requires:
  `const isProduction = env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production';`
- **Fail-Closed Mandate:** If `isProduction === true` and any of `[SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY]` are missing or evaluate to placeholder values:
  - The Worker **MUST FAIL CLOSED** with HTTP 503 Service Unavailable.
  - Silent fallback to in-memory mocks is **STRICTLY PROHIBITED**.
  - No fake order confirmation, fake payment capture, or fake admin authorization may be returned.

### 9.3 Strict CORS Origin Whitelist
```typescript
// Verified Target Whitelist for worker/index.ts
const PRODUCTION_ALLOWED_ORIGINS = [
  "https://shantety.shop",
  "https://www.shantety.shop",
];

const STAGING_ALLOWED_ORIGINS = [
  "https://shantety2013.pages.dev",
  "http://localhost:3000",
  "http://localhost:5173",
];
```
- Wildcard `Access-Control-Allow-Origin: *` is **STRICTLY PROHIBITED** on all state-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`).
- CORS preflight `OPTIONS` requests from unauthorized origins receive no CORS allow headers.

---

## 10. Complete Commerce Persistence & Authorization Audit

A comprehensive audit of every business entity comparing current repository state to target persistent architecture:

| Commerce Entity | Current Source of Truth | Current Persistence Mechanism | Target Database Table / Object | Current Authorization Boundary | Target RLS Policy | Worker Auth Requirement | In-Memory Fallback Status | Missing Requirement | Proposed Architectural Correction |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Products** | `commerceService.ts` (`state.products`) | In-memory array (`INITIAL_PRODUCTS`) | `public.products` | None (Public read) | Public SELECT; Admin ALL | None (Public read) | Active in dev/prod | Database PostgREST query | Wire `supabase.from('products').select()` |
| **Product Variants** | `commerceService.ts` (`state.products[].variants`) | In-memory array | `public.product_variants` | None | Public SELECT (safe columns only; stock hidden); Admin ALL | None | Active in dev/prod | Column-level security verification | Revoke public SELECT on `stock_on_hand`, `stock_reserved` |
| **Inventory** | `commerceService.ts` (`variant.stock_*`) | In-memory counters | `public.product_variants` | None | `service_role` / Admin only | Admin JWT | Active in dev/prod | Row-level locking RPC | Deploy `execute_atomic_checkout` |
| **Inventory Movements** | `commerceService.ts` (`state.movements`) | In-memory array | `public.inventory_movements` | None | Read: Admin; Write: `service_role` | Admin JWT | Active in dev/prod | Double-entry database audit ledger | Insert into `inventory_movements` on all stock changes |
| **Orders** | `commerceService.ts` (`state.orders`) | In-memory array (`INITIAL_ORDERS`) | `public.orders` | None | Read: Customer self (`auth.uid()`) or Admin; Write: `service_role` | Customer JWT / Guest | Active in dev/prod | PostgREST persistence | Insert orders via atomic checkout RPC |
| **Order Items** | `commerceService.ts` (`order.items`) | In-memory array | `public.order_items` | None | Read: Customer self via order join or Admin; Write: `service_role` | Same as order | Active in dev/prod | Database foreign key persistence | Batch insert into `order_items` |
| **Order Status History** | Non-existent in memory (only local timestamps) | None | `public.order_status_history` | None | Read: Customer / Admin; Write: `service_role` | Admin JWT | Inactive | Database table not written | Deploy `apply_order_status_transition` RPC |
| **Payments** | `order.payment_status` flag in memory | In-memory property | `public.payments` (Proposed) / `orders.payment_status` | None | `service_role` only | Webhook HMAC / Admin | Active in dev/prod | Dedicated payments ledger & webhook table | Create `public.payments` table for multi-attempt logs |
| **Refunds** | `updateOrderStatus('refunded')` in memory | In-memory property | `public.refunds` (Proposed) | None | `super_admin`, `store_manager` | Admin JWT | Active in dev/prod | Financial reconciliation ledger | Separate refund record linked to provider transaction |
| **Reviews** | `commerceService.ts` (`state.reviews`) | In-memory array (`INITIAL_REVIEWS`) | `public.reviews` | None | Public read; Customer insert | Customer JWT | Active in dev/prod | Database persistence | Wire `supabase.from('reviews')` queries and mutations |
| **CMS Sections** | `commerceService.ts` (`state.cmsSections`) | In-memory array | `public.cms_sections` | Admin role in memory | Public read; Admin write | Admin JWT | Active in dev/prod | Migration 004 unapplied | Apply Migration 004 in live Supabase |
| **Site Customization** | `commerceService.ts` (`state.siteCustomization`)| In-memory object | `public.site_customization` | Admin role in memory | Public read; Admin write | Admin JWT | Active in dev/prod | Migration 004 unapplied | Apply Migration 004 in live Supabase |
| **Newsletter** | `commerceService.ts` (`subscribeNewsletter`) | Supabase when client present; in-memory fallback | `public.newsletter_subscribers` | Email regex check | Public insert; Admin read | Public / Admin | Active fallback | Migration 005 unapplied in live | Apply Migration 005 in live Supabase |
| **Admin Memberships** | `commerceService.ts` (`state.adminMemberships`)| In-memory array | `public.admin_memberships` | Role check in memory | Admin read; Owner write | Admin JWT | Active in dev/prod | Supabase Auth linking | Link admin memberships to live `auth.users` |
| **Audit Logs** | `commerceService.ts` (`state.auditLogs`) | In-memory array (`INITIAL_AUDIT_LOGS`)| `public.audit_logs` | Admin role in memory | Read: Admin; Write: `service_role` | Admin JWT | Active in dev/prod | Migration 003 persistence | Wire `supabase.from('audit_logs')` |

---

## 11. Separate State Machines: Order, Payment, Inventory & Returns

To prevent architectural ambiguity, the four lifecycles are modeled as **completely independent state machines**:

### 11.1 Order Lifecycle FSM
```
                      ┌───────────────┐
                      │    PENDING    │
                      └───────┬───────┘
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
           ┌───────────────┐       ┌───────────────┐
           │  PROCESSING   │       │   CANCELLED   │ (Terminal)
           └───────┬───────┘       └───────────────┘
                   │                       ▲
                   ▼                       │
           ┌───────────────┐               │
           │    SHIPPED    │───────────────┘
           └───────┬───────┘
                   │
                   ▼
           ┌───────────────┐
           │   DELIVERED   │
           └───────┬───────┘
                   │
                   ▼
           ┌───────────────┐
           │   REFUNDED    │ (Terminal)
           └───────────────┘
```

### 11.2 Payment Lifecycle FSM
```
               ┌────────────────────────┐
               │ AWAITING_PAYMENT (Card)│
               │   PENDING (COD)        │
               └───────────┬────────────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
      ┌────────────┐┌────────────┐┌────────────┐
      │    PAID    ││   FAILED   ││  EXPIRED   │ (Terminal)
      └─────┬──────┘└────────────┘└────────────┘
            │
      ┌─────┴──────────────┐
      ▼                    ▼
┌───────────┐        ┌───────────┐
│ PARTIALLY │        │ REFUNDED  │ (Terminal)
│ REFUNDED  │        └───────────┘
└─────┬─────┘
      ▼
┌───────────┐
│ REFUNDED  │ (Terminal)
└───────────┘
```

### 11.3 Inventory Reservation FSM
```
               ┌────────────────────────┐
               │    UNRESERVED STOCK    │
               │  (Available to Sell)   │
               └───────────┬────────────┘
                           │ Checkout Placed
                           ▼
               ┌────────────────────────┐
               │     RESERVED STOCK     │
               └───────────┬────────────┘
                           │
             ┌─────────────┴─────────────┐
             │ Order Cancelled / Timeout │ Order Delivered (Physical Handover)
             ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐
│    STOCK RELEASED      │  │   STOCK DEDUCTED       │
│ (Back to Available)    │  │ (stock_on_hand reduced)│
└────────────────────────┘  └────────────────────────┘
```

### 11.4 Return & Inspection FSM
```
               ┌────────────────────────┐
               │     RETURN_REQUESTED   │
               └───────────┬────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐
│     RETURN_REJECTED    │  │     RETURN_RECEIVED    │
│  (No Stock or Refund)  │  │   (Physical Package)   │
└────────────────────────┘  └────────────┬───────────┘
                                         │ Quality Inspection
                           ┌─────────────┴─────────────┐
                           ▼                           ▼
              ┌────────────────────────┐  ┌────────────────────────┐
              │    QC_PASS_RESTOCKED   │  │    QC_FAIL_DAMAGED     │
              │(stock_on_hand restored)│  │ (Item Scrapped/Damaged)│
              └────────────┬───────────┘  └────────────┬───────────┘
                           │                           │
                           ▼                           ▼
              ┌────────────────────────────────────────────────────┐
              │              FINANCIAL REFUND PROCESSED            │
              └────────────────────────────────────────────────────┘
```

---

## 12. Migration Safety, Staging Rehearsal & Recovery Plan

### 12.1 Authoritative Production Migration Reality
- **Local Files Inspected:** Files `001_initial_schema_and_security.sql` through `005_newsletter_subscribers.sql` exist in `/supabase/migrations/`.
- **Live Production Status:** **UNVERIFIED & BLOCKED**.
  - Direct HTTP query to `https://shantety.shop/api/readiness` confirms missing Supabase credentials in Worker.
  - Live PostgreSQL schema tables in `mziomwhluwjtadchnxdz.supabase.co` cannot be queried directly from this environment without authorization.
  - **Critical Rule:** The existence of a SQL file locally is **NOT proof** that the migration was executed in production.

### 12.2 Migration Dependency Sequence
```
Migration 001: Initial Schema, Catalog Taxonomy & Admin RBAC
 ├── Preconditions: PostgreSQL 15+, pgcrypto, auth schema
 └── Defines: categories, brands, colors, sizes, products, product_variants, customer_profiles, customer_addresses, admin_memberships
      │
      ├───────────────────────┬───────────────────────┬───────────────────────┐
      ▼                       ▼                       ▼                       ▼
Migration 002:         Migration 003:         Migration 004:         Migration 005:
Orders & Inventory     Audit & Reviews        CMS & Customization    Newsletter
├── orders             ├── audit_logs         ├── cms_sections       └── newsletter_subscribers
├── order_items        └── reviews            └── site_customization
├── inventory_movements
└── RPC tracking
      │
      ▼
Migration 006 (PROPOSED):
Idempotency & Concurrency Hardening
├── idempotency_keys
├── execute_atomic_checkout RPC
├── claim_guest_order RPC
└── apply_order_status_transition RPC
```

### 12.3 Rollback & Disaster Recovery Procedures
1. **Pre-Migration Snapshot:** A full backup snapshot (`pg_dump`) must be performed in the Supabase Cloud dashboard prior to DDL execution.
2. **Transactional Safety:** Every migration must be enclosed in explicit `BEGIN; ... COMMIT;` blocks. If any statement encounters an error, the database rolls back completely to the pre-migration state.
3. **Pre-Authored Down Scripts:** For each migration `00X_name.sql`, a corresponding `00X_down.sql` must be validated in staging before production execution:
   - `001_down.sql`: Drops created tables, types, and functions in reverse dependency order.
   - `002_down.sql`: Drops orders, items, movements, and tracking RPCs.
   - `003_down.sql`: Drops audit logs and reviews.
   - `004_down.sql`: Drops CMS sections and site customization.
   - `005_down.sql`: Drops newsletter subscribers.
4. **Post-Migration Verification Suite:** Immediately following DDL execution, run `/supabase/migrations/verification_queries.sql` in the Supabase SQL Editor to confirm table presence, column types, and zero public permissions on sensitive columns.

---

## 13. Final RPC/Function Authorization Matrix

| Proposed / Verified Function | Purpose | Security Context | Owner | Permitted Callers | Required Identity Parameter | Explicit Grants / Revocations | Current Evidence Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`public.manage_admin_membership`** | Modify administrator roles and activation status. | `SECURITY DEFINER` | `postgres` | `authenticated` (Owner Only) | Verified `auth.uid()` matching owner UUID | `REVOKE ALL FROM PUBLIC, anon;`<br>`GRANT EXECUTE TO authenticated;` | **VERIFIED IN REPOSITORY** (`001_initial_schema_and_security.sql`) |
| **`public.track_guest_order`** | Secure guest tracking without PII leakage. | `SECURITY DEFINER` | `postgres` | `anon`, `authenticated`, `service_role` | Plaintext token parameter | `REVOKE ALL FROM PUBLIC;`<br>`GRANT EXECUTE TO anon, authenticated, service_role;` | **VERIFIED IN REPOSITORY** (`002_tracking_hash_and_atomic_checkout.sql`) |
| **`public.lookup_guest_order`** | Compatibility alias for order tracking. | `SECURITY DEFINER` | `postgres` | `anon`, `authenticated`, `service_role` | Order number + token hash parameter | `REVOKE ALL FROM PUBLIC;`<br>`GRANT EXECUTE TO anon, authenticated, service_role;` | **VERIFIED IN REPOSITORY** (`002_tracking_hash_and_atomic_checkout.sql`) |
| **`public.execute_atomic_checkout`** | Atomic stock reservation, pricing calculation, order creation. | `SECURITY DEFINER` | `postgres` | `service_role` (Worker only) | Verified customer UID or NULL (guest) | `REVOKE ALL FROM PUBLIC, anon, authenticated;`<br>`GRANT EXECUTE TO service_role;` | **PROPOSED — NOT IMPLEMENTED** |
| **`public.apply_order_status_transition`** | FSM status transition, stock fulfillment/cancellation, audit log. | `SECURITY DEFINER` | `postgres` | `service_role` (Worker only) | Verified admin UID passed by Worker | `REVOKE ALL FROM PUBLIC, anon, authenticated;`<br>`GRANT EXECUTE TO service_role;` | **PROPOSED — NOT IMPLEMENTED** |
| **`public.claim_guest_order`** | Cryptographic one-time guest order claiming. | `SECURITY DEFINER` | `postgres` | `authenticated` (Customer) | Caller `auth.uid()` | `REVOKE ALL FROM PUBLIC, anon;`<br>`GRANT EXECUTE TO authenticated;` | **PROPOSED — NOT IMPLEMENTED** |

---

## 14. Release Roadmap & Acceptance Criteria (Phases 0–8)

The project is structured into sequential, dependency-ordered phases. **No production credentials, migrations, or deployments may be executed without explicit owner sign-off.**

```
Phase 0: Read-Only Evidence Baseline [CURRENT PHASE]
   │
   ▼
Phase 1: Backend & Security Architecture Finalization
   │
   ▼
Phase 2: Staging Infrastructure & Migration Rehearsal (Zero Production Changes)
   │
   ▼
Phase 3: Persistent Commerce Implementation (Database-backed services)
   │
   ▼
Phase 4: Payment Provider Sandbox (Paymob HMAC & Webhook verification)
   │
   ▼
Phase 5: Checkout & Customer Identity Integration
   │
   ▼
Phase 6: Storefront & Admin UX Refinement (Isolated from database changes)
   │
   ▼
Phase 7: Staging Acceptance Testing (Concurrency, overselling, replay)
   │
   ▼
Phase 8: Production Release Review & Formal Authorization
```

### Phase 0: Read-Only Evidence Baseline
- **Objective:** Complete non-destructive repository and runtime audit.
- **Evidence:** Source code analysis, local test suite execution, live readiness probe.
- **Acceptance Criteria:** Architectural specification completed; all 16 sections delivered.
- **Status:** **COMPLETED**.

### Phase 1: Backend & Security Architecture
- **Objective:** Finalize all SQL migration scripts (001–006), stored procedures, and TypeScript interfaces.
- **Prerequisites:** Owner approval of Phase 0 specification.
- **Acceptance Criteria:** `006_idempotency_and_concurrency.sql` written locally; TypeScript types updated in `src/types/ecommerce.ts`. Zero live changes.
- **Authorization Required:** Project Owner Phase 1 Approval.

### Phase 2: Staging Infrastructure & Migration Rehearsal
- **Objective:** Rehearse migrations 001–006 against a staging Supabase instance; validate down-scripts.
- **Prerequisites:** Staging database credentials provided.
- **Acceptance Criteria:** Migrations run with 0 errors; `verification_queries.sql` passes; rollback down-scripts successfully return staging database to initial state.
- **Authorization Required:** Staging Access Authorization.

### Phase 3: Persistent Commerce Implementation
- **Objective:** Replace in-memory array mutations in `commerceService.ts` and `worker/index.ts` with real Supabase PostgREST and RPC calls.
- **Prerequisites:** Phase 2 staging database active.
- **Acceptance Criteria:** Unit and integration tests pass against staging database; zero fallback to in-memory state when credentials configured.
- **Authorization Required:** Project Owner Phase 3 Approval.

### Phase 4: Payment Provider Sandbox
- **Objective:** Implement Paymob HMAC-SHA512 webhook handler and test sandbox transactions.
- **Prerequisites:** Paymob sandbox test credentials.
- **Acceptance Criteria:** Valid HMAC webhook successfully transitions order to `paid`; invalid HMAC webhook rejected with HTTP 401; duplicate webhook rejected via idempotency key.
- **Authorization Required:** Paymob Integration Approval.

### Phase 5: Checkout & Customer Identity Integration
- **Objective:** Connect storefront `CheckoutPage.tsx` to `useCustomerAuth()`, prepopulate verified profile/addresses, and implement secure guest claiming UI.
- **Prerequisites:** Phase 3 and Phase 4 complete.
- **Acceptance Criteria:** Returning customer sees prefilled address; guest checkout succeeds; optional guest claiming attaches order to verified account.
- **Authorization Required:** Storefront Functional Approval.

### Phase 6: Storefront & Admin UX Refinement
- **Objective:** Luxury mobile header (< 640px logo-only, 44px hitboxes), direct `/admin` URL routing sync, and unblocking admin login tabs.
- **Prerequisites:** Phase 5 complete.
- **Acceptance Criteria:** Mobile header free of horizontal scroll or brand text wrapping; `/admin` accessible via discreet footer link and direct URL without circular auth errors.
- **Authorization Required:** UI/UX Acceptance Approval.

### Phase 7: Staging Acceptance Testing
- **Objective:** High-concurrency stress testing and security penetration audit on staging.
- **Prerequisites:** Staging environment fully deployed.
- **Acceptance Criteria:** 20 concurrent requests for 1 stock unit results in exactly 1 order and 19 `INSUFFICIENT_STOCK` errors; replay of payment webhooks prevented; zero PII leaked in guest tracking.
- **Authorization Required:** Security & Concurrency Sign-Off.

### Phase 8: Production Release Review & Formal Authorization
- **Objective:** Execution of production migrations, setting production Cloudflare secrets, and final deployment.
- **Prerequisites:** Written authorization from Shantety Project Owner; verified database backup snapshot.
- **Acceptance Criteria:** `https://shantety.shop/api/readiness` returns `status: "PRODUCTION_READY"`; end-to-end live checkout verified with real test payment.
- **Authorization Required:** **EXPLICIT WRITTEN PRODUCTION AUTHORIZATION**.

---

## 15. Summary of Required Deliverables

1. **Corrected Technical Decisions:** Fully specified in Sections 3, 4, 5, 6, 7, and 8.
2. **Remaining Architectural and Security Risks:** Documented in Section 1.
3. **Current Implementation vs Proposed Design Matrix:** Detailed in Section 10.
4. **Final RPC/Function Authorization Matrix:** Detailed in Section 13.
5. **Final Order/Payment/Inventory/Refund State Matrices:** Detailed in Section 11.
6. **Guest Order Claiming Protocol:** Specified in Section 6.
7. **Cloudflare Variable/Secret Matrix:** Formatted in Section 9.
8. **Migration Dependency and Recovery Plan:** Outlined in Section 12.
9. **Complete Commerce Persistence and Authorization Matrix:** Documented in Section 10.
10. **Phase-by-Phase Acceptance Criteria:** Formatted in Section 14.
11. **Explicit List of Unresolved Questions & Missing Evidence:**
    - *Unresolved 1:* Authoritative Supabase Auth UUID for store owner (`shantety2013@gmail.com`) is **UNVERIFIED**.
    - *Unresolved 2:* Live status of migrations 001–005 on `mziomwhluwjtadchnxdz.supabase.co` is **UNVERIFIED** due to missing live credentials.
    - *Unresolved 3:* Paymob credentials (`API_KEY`, `HMAC_SECRET`, `INTEGRATION_ID`) are **UNCONFIGURED** in the Worker environment.
12. **Final Readiness Classification:** **ARCHITECTURE CONDITIONAL**.

---

## 16. Final Status Declarations

In strict adherence to project authority and safety guidelines:

- **Architecture Review:** **ARCHITECTURE CONDITIONAL** (Complete specification delivered; awaiting owner confirmation of unresolved identity and provider questions).
- **Implementation:** **IMPLEMENTATION NOT AUTHORIZED**.
- **Production Migrations:** **PRODUCTION MIGRATIONS NOT AUTHORIZED**.
- **Production Secrets:** **PRODUCTION SECRETS NOT AUTHORIZED**.
- **Production Deployment:** **PRODUCTION DEPLOYMENT NOT AUTHORIZED**.

**The assistant has stopped all actions and is awaiting explicit written approval from the Shantety Project Owner.**
