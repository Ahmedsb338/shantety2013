import { Hono } from "hono";
import crypto from "crypto";
import { authoritativeStore } from "../src/server/commerceService";
import { getBackendReadiness, getSupabaseAdminClient } from "../src/server/supabaseBackend";
import { verifyAdminRequest, VerifiedAdminUser } from "../src/server/authMiddleware";

type Bindings = {
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  DATABASE_URL?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  ALLOW_DEV_MOCKS?: string | boolean;
  GEMINI_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// In-memory idempotency cache: key -> { hash: string, response: any, statusCode: number, timestamp: number }
const idempotencyCache = new Map<string, { hash: string; response: any; statusCode: number; timestamp: number }>();

// ─── 1. Restricted CORS Middleware ─────────────────────────────
const ALLOWED_ORIGINS = [
  "https://shantety.shop",
  "https://www.shantety.shop",
  "https://shantety2013.pages.dev",
  "http://localhost:3000",
  "http://localhost:5173",
];

// Helper to derive authenticated customer ID from verified Supabase Bearer JWT (Never trust client body customer_id!)
async function extractVerifiedCustomer(c: any): Promise<{ customerId?: string; email?: string } | Response> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {}; // Guest checkout (customerId is strictly undefined)
  }

  const token = authHeader.slice(7).trim();
  const supabase = getSupabaseAdminClient(c.env);
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return c.json(
          {
            success: false,
            error: "Unauthorized: Invalid or expired customer authentication session",
            error_ar: "جلسة الدخول منتهية الصلاحية أو غير صالحة. يرجى تسجيل الدخول مجدداً.",
          },
          401
        );
      }
      return { customerId: user.id, email: user.email };
    } catch (e: any) {
      return c.json(
        {
          success: false,
          error: `Authentication verification error: ${e.message}`,
          error_ar: "تعذر التحقق من جلسة العميل المعتمدة.",
        },
        401
      );
    }
  }

  return {};
}

app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  const isAllowed = origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".shantety.shop") || origin.endsWith(".pages.dev"));

  if (isAllowed) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    // Same-origin or non-browser client
    c.header("Access-Control-Allow-Origin", "*");
  }

  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-admin-email, x-admin-role, cf-connecting-ip"
  );
  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
});

// ─── 2. Auth Helper for Admin Endpoints ─────────────────────────
async function authenticateAdmin(
  c: any,
  requiredRole?: "owner_only" | "store_manager" | "any_active_admin"
): Promise<{ user: VerifiedAdminUser } | Response> {
  const authHeader = c.req.header("Authorization");
  const fallbackEmail = c.req.header("x-admin-email");

  const verification = await verifyAdminRequest(authHeader, fallbackEmail, c.env);

  if (!verification.isAuthorized || !verification.user) {
    return c.json(
      {
        error: verification.error || "Unauthorized",
        error_ar: verification.errorAr || "غير مصرح: يجب تسجيل الدخول برمز مصادقة إداري معتمد.",
      },
      verification.statusCode || 401
    );
  }

  const user = verification.user;

  if (requiredRole === "owner_only" && !user.isOwner) {
    return c.json(
      {
        error: "Forbidden: This operation is restricted exclusively to the store owner",
        error_ar: "غير مصرح: هذه العملية مخصصة لمالك المتجر حصراً.",
      },
      403
    );
  }

  if (requiredRole === "store_manager" && user.role === "order_staff") {
    return c.json(
      {
        error: "Forbidden: Order staff permissions cannot perform catalog or configuration edits",
        error_ar: "غير مصرح: موظف معالجة الطلبات لا يملك صلاحية تعديل الكتالوج أو الإعدادات.",
      },
      403
    );
  }

  return { user };
}

// ─── 3. Diagnostic & Readiness APIs ────────────────────────────
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    engine: "Supabase PostgreSQL (Cloudflare Worker API)",
    brand: "Shantety - شنطتي",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/readiness", (c) => {
  const readiness = getBackendReadiness(c.env);
  return c.json({
    status: readiness.status,
    isProduction: readiness.isProduction,
    isConfigured: readiness.isConfigured,
    allowDevMocks: readiness.allowDevMocks,
    checks: readiness.checks,
    missingRequiredKeys: readiness.missingRequiredKeys,
    cmsPersistenceStatus: "BLOCKED (Missing Migration 004 in live Supabase)",
    brand: "Shantety (شنطتي)",
    timestamp: new Date().toISOString(),
  });
});

// ─── 4. Public Catalog & Safe Storefront APIs ──────────────────
app.get("/api/products", (c) => {
  const publicProds = authoritativeStore.getPublicProducts();
  return c.json(publicProds);
});

app.get("/api/products/:id", (c) => {
  const prod = authoritativeStore.getProductById(c.req.param("id"));
  if (!prod) {
    return c.json({ error: "Product not found" }, 404);
  }
  return c.json(prod);
});

// ─── 5. Authoritative Server-Side Checkout (Customer JWT Identity & Idempotency) ──
app.post("/api/checkout", async (c) => {
  try {
    const body = await c.req.json();

    // 1. Idempotency Check
    const idempotencyKey = c.req.header("Idempotency-Key");
    let requestHash: string | undefined;
    if (idempotencyKey) {
      requestHash = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
      const cached = idempotencyCache.get(idempotencyKey);
      if (cached) {
        if (cached.hash === requestHash) {
          c.header("Idempotency-Replay", "true");
          return c.json(cached.response, cached.statusCode as any);
        } else {
          return c.json(
            {
              success: false,
              error: "Conflict: Idempotency key reused with different request payload",
              error_ar: "تعارض: مفتاح العملية مكرر مع بيانات مختلفة.",
            },
            409
          );
        }
      }
    }

    // 2. Server-Authoritative Customer Identity Derivation (Never trust client body customer_id!)
    const customerAuth = await extractVerifiedCustomer(c);
    if (customerAuth instanceof Response) {
      return customerAuth;
    }

    // Overwrite or strip any client-supplied customer_id with the verified token UUID
    body.customer_id = customerAuth.customerId;
    if (customerAuth.email) {
      body.customer_email = customerAuth.email;
    }

    const result = authoritativeStore.processCheckout(body, c.env);
    const statusCode = result.success ? 201 : result.error_en?.includes("not configured") ? 503 : 400;

    // Cache successful idempotency response
    if (idempotencyKey && requestHash && result.success) {
      idempotencyCache.set(idempotencyKey, {
        hash: requestHash,
        response: result,
        statusCode: 201,
        timestamp: Date.now(),
      });
    }

    return c.json(result, statusCode);
  } catch (e: any) {
    return c.json({ error: e.message || "Checkout error" }, 500);
  }
});

app.post("/api/orders", async (c) => {
  try {
    const body = await c.req.json();
    const customerAuth = await extractVerifiedCustomer(c);
    if (customerAuth instanceof Response) {
      return customerAuth;
    }

    body.customer_id = customerAuth.customerId;
    if (customerAuth.email) {
      body.customer_email = customerAuth.email;
    }

    const cartItems = (body.items || body.rawCartItems || []).map((it: any) => ({
      variant_id: it.variant_id || it.variant?.id,
      quantity: it.quantity || 1,
    }));
    const result = authoritativeStore.processCheckout(
      {
        ...body,
        cartItems,
      },
      c.env
    );
    if (!result.success) {
      const status = result.error_en?.includes("not configured") ? 503 : 400;
      return c.json(result, status);
    }
    return c.json(result.order, 201);
  } catch (e: any) {
    return c.json({ error: e.message || "Order creation error" }, 500);
  }
});

// ─── 6. Secure Guest Order Tracking & Cryptographic Claiming ───
app.post("/api/orders/track", async (c) => {
  try {
    const { order_number, tracking_token } = await c.req.json();
    const clientIp = c.req.header("cf-connecting-ip") || "unknown";
    const result = authoritativeStore.trackOrder(order_number, tracking_token, clientIp, c.env);
    if (!result.success) {
      const status = result.error_en?.includes("not configured") ? 503 : 404;
      return c.json(result, status);
    }
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || "Tracking lookup error" }, 500);
  }
});

app.post("/api/orders/claim", async (c) => {
  try {
    const customerAuth = await extractVerifiedCustomer(c);
    if (customerAuth instanceof Response) {
      return customerAuth;
    }
    if (!customerAuth.customerId) {
      return c.json(
        {
          success: false,
          error: "Unauthorized: You must be logged into your customer account to claim an order",
          error_ar: "غير مصرح: يجب تسجيل الدخول إلى حساب العميل لربط الطلب.",
        },
        401
      );
    }

    const { order_number, tracking_token } = await c.req.json();
    const result = authoritativeStore.claimGuestOrder(
      order_number,
      tracking_token,
      customerAuth.customerId,
      customerAuth.email || "customer@shantety.com",
      c.env
    );

    if (!result.success) {
      return c.json(result, 400);
    }
    return c.json({
      success: true,
      order_number: result.order_number,
      message_ar: "تم ربط الطلب بحسابك بنجاح!",
      message_en: "Order successfully linked to your customer account!",
    });
  } catch (e: any) {
    return c.json({ error: e.message || "Order claiming error" }, 500);
  }
});

// ─── 6.1 Public Newsletter Subscription (Supabase Persistent) ──
app.post("/api/newsletter/subscribe", async (c) => {
  try {
    const { email, source } = await c.req.json();
    const result = await authoritativeStore.subscribeNewsletter(email, source, c.env);
    return c.json(result);
  } catch (e: any) {
    return c.json(
      {
        success: false,
        error: e.message || "Subscription error",
        error_ar: "تعذر الاشتراك في النشرة البريدية. يرجى التأكد من صحة البريد الإلكتروني.",
      },
      400
    );
  }
});

// ─── 7. Authenticated Admin Products API ───────────────────────
app.get("/api/admin/products", async (c) => {
  const auth = await authenticateAdmin(c, "any_active_admin");
  if (auth instanceof Response) return auth;
  return c.json(authoritativeStore.getAdminProducts());
});

app.post("/api/products", async (c) => {
  const auth = await authenticateAdmin(c, "store_manager");
  if (auth instanceof Response) return auth;

  try {
    const product = await c.req.json();
    const saved = authoritativeStore.upsertProduct(product, auth.user.email);
    return c.json({ success: true, product: saved });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/api/products/:id", async (c) => {
  const auth = await authenticateAdmin(c, "store_manager");
  if (auth instanceof Response) return auth;

  try {
    const success = authoritativeStore.deleteProduct(c.req.param("id"), auth.user.email);
    return c.json({ success });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── 8. Authenticated Admin Orders API ─────────────────────────
app.get("/api/orders", async (c) => {
  const auth = await authenticateAdmin(c, "any_active_admin");
  if (auth instanceof Response) return auth;
  return c.json(authoritativeStore["state"].orders);
});

app.patch("/api/orders/:id/status", async (c) => {
  const auth = await authenticateAdmin(c, "any_active_admin");
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json();
    const result = authoritativeStore.updateOrderStatus(
      c.req.param("id"),
      body.status,
      body.carrier,
      body.trackingNumber,
      auth.user.email,
      c.env
    );
    if (!result.success) {
      const status = result.error?.includes("not configured") ? 503 : 400;
      return c.json(result, status);
    }
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── 9. Admin Memberships & Owner RBAC ─────────────────────────
app.post("/api/admin/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password required" }, 400);
    }

    const verification = authoritativeStore.verifyAdminRole(email);
    if (!verification.isAuthorized) {
      return c.json(
        {
          error: "This account is not authorized for administrative access.",
        },
        403
      );
    }

    return c.json({
      success: true,
      user: {
        email,
        role: verification.role,
        isOwner: verification.isOwner,
        displayName: email.split("@")[0],
      },
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/api/admin/memberships", async (c) => {
  const auth = await authenticateAdmin(c, "owner_only");
  if (auth instanceof Response) return auth;
  return c.json(authoritativeStore.getAdminMemberships());
});

app.post("/api/admin/memberships", async (c) => {
  const auth = await authenticateAdmin(c, "owner_only");
  if (auth instanceof Response) return auth;

  try {
    const { targetUserId, role, isActive } = await c.req.json();
    const result = authoritativeStore.manageAdminMembership(
      auth.user.email,
      targetUserId,
      role,
      isActive,
      c.env
    );
    if (!result.success) {
      const status = result.error?.includes("not configured") ? 503 : 403;
      return c.json(result, status);
    }
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── 10. Customer Reviews API ──────────────────────────────────
app.get("/api/reviews", (c) => {
  const productId = c.req.query("productId");
  return c.json(authoritativeStore.getReviews(productId));
});

app.post("/api/reviews", async (c) => {
  try {
    const body = await c.req.json();
    const review = authoritativeStore.addReview(body);
    return c.json({ success: true, review });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/api/reviews/:id/helpful", (c) => {
  const count = authoritativeStore.voteHelpful(c.req.param("id"));
  return c.json({ success: true, helpful_count: count });
});

// ─── 11. Content Management System (CMS) API ───────────────────
app.get("/api/cms", (c) => {
  return c.json(authoritativeStore.getCmsSections());
});

app.get("/api/cms/:key", (c) => {
  const sec = authoritativeStore.getCmsSection(c.req.param("key"));
  if (!sec) return c.json({ error: "Section not found" }, 404);
  return c.json(sec);
});

app.put("/api/cms/:key", async (c) => {
  const auth = await authenticateAdmin(c, "store_manager");
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json();
    const result = authoritativeStore.updateCmsSection(
      c.req.param("key"),
      body,
      auth.user.email,
      c.env
    );
    if (!result.success) {
      const status = result.error?.includes("Migration 004 is required") ? 503 : 400;
      return c.json(result, status);
    }
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/api/customization", (c) => {
  return c.json(authoritativeStore.getSiteCustomization());
});

app.put("/api/customization", async (c) => {
  const auth = await authenticateAdmin(c, "store_manager");
  if (auth instanceof Response) return auth;

  try {
    const body = await c.req.json();
    const updated = authoritativeStore.updateSiteCustomization(body, auth.user.email, c.env);
    return c.json({ success: true, customization: updated });
  } catch (e: any) {
    const status = e.statusCode || 500;
    return c.json({ error: e.message }, status);
  }
});

// ─── 12. Audit Logs API ────────────────────────────────────────
app.get("/api/audit-logs", async (c) => {
  const auth = await authenticateAdmin(c, "any_active_admin");
  if (auth instanceof Response) return auth;
  return c.json(authoritativeStore.getAuditLogs(auth.user.role));
});

// ─── 13. Static Assets & SPA Fallback ──────────────────────────
app.all("*", async (c) => {
  if (c.env.ASSETS) {
    const res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status === 404 && c.req.header("accept")?.includes("text/html")) {
      const url = new URL(c.req.url);
      url.pathname = "/index.html";
      return await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
    }
    return res;
  }
  return c.text("Shantety API & Cloudflare Worker ready");
});

export default app;
