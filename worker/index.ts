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

// ─── Static Assets Fallback ────────────────────────────────────
app.all("*", async (c) => {
  if (c.env.ASSETS) {
    return await c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("Shantety API & Cloudflare Worker ready");
});

export default app;
