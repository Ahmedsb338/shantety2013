import { Hono } from "hono";
import { authoritativeStore } from "../src/server/commerceService";

type Bindings = {
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GEMINI_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ─── API Health & Info ─────────────────────────────────────────
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    engine: "Supabase PostgreSQL (Cloudflare Worker API)",
    brand: "Shantety - شنطتي",
    timestamp: new Date().toISOString(),
  });
});

// ─── Products API (Safe storefront fields) ─────────────────────
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

// ─── Authoritative Server-Side Checkout ─────────────────────────
app.post("/api/checkout", async (c) => {
  try {
    const body = await c.req.json();
    const result = authoritativeStore.processCheckout(body);
    if (!result.success) {
      return c.json(result, 400);
    }
    return c.json(result, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/api/orders", async (c) => {
  try {
    const body = await c.req.json();
    const cartItems = (body.items || body.rawCartItems || []).map((it: any) => ({
      variant_id: it.variant_id || it.variant?.id,
      quantity: it.quantity || 1,
    }));
    const result = authoritativeStore.processCheckout({
      ...body,
      cartItems,
    });
    if (!result.success) {
      return c.json(result, 400);
    }
    return c.json(result.order, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Secure Guest Tracking ─────────────────────────────────────
app.post("/api/orders/track", async (c) => {
  try {
    const { order_number, tracking_token } = await c.req.json();
    const clientIp = c.req.header("cf-connecting-ip") || "unknown";
    const result = authoritativeStore.trackOrder(order_number, tracking_token, clientIp);
    if (!result.success) {
      return c.json(result, 404);
    }
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Admin Orders API ──────────────────────────────────────────
app.get("/api/orders", (c) => {
  return c.json(authoritativeStore.getAdminProducts());
});

app.patch("/api/orders/:id/status", async (c) => {
  try {
    const body = await c.req.json();
    const actor = c.req.header("x-admin-email") || "admin";
    const result = authoritativeStore.updateOrderStatus(
      c.req.param("id"),
      body.status,
      body.carrier,
      body.trackingNumber,
      actor
    );
    if (!result.success) {
      return c.json(result, 400);
    }
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Content Management System (CMS) API ───────────────────────
app.get("/api/cms", (c) => {
  return c.json(authoritativeStore.getCmsSections());
});

app.get("/api/cms/:key", (c) => {
  const sec = authoritativeStore.getCmsSection(c.req.param("key"));
  if (!sec) return c.json({ error: "Section not found" }, 404);
  return c.json(sec);
});

app.put("/api/cms/:key", async (c) => {
  try {
    const body = await c.req.json();
    const actor = c.req.header("x-admin-email") || "admin";
    const result = authoritativeStore.updateCmsSection(c.req.param("key"), body, actor);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/api/customization", (c) => {
  return c.json(authoritativeStore.getSiteCustomization());
});

app.put("/api/customization", async (c) => {
  try {
    const body = await c.req.json();
    const actor = c.req.header("x-admin-email") || "admin";
    const updated = authoritativeStore.updateSiteCustomization(body, actor);
    return c.json({ success: true, customization: updated });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── Audit Logs ────────────────────────────────────────────────
app.get("/api/audit-logs", (c) => {
  const role = c.req.header("x-admin-role") || "super_admin";
  return c.json(authoritativeStore.getAuditLogs(role));
});

// ─── Static Assets & SPA Fallback ──────────────────────────────
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
