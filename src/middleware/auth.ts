// ─── src/middleware/auth.ts (محوّل لـ Hono + Workers) ──────────────

import { createMiddleware } from "hono/factory";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type Env = {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
};

// تهيئة Firebase Admin مرة واحدة (تتشاركها كل الطلبات في نفس الـ isolate)
function getFirebaseAuth(env: Env) {
  const appName = "shantety-admin";
  const app = getApps().find((a) => a.name === appName) ||
    initializeApp(
      {
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          // المفتاح يُخزن مع \\n كنص — نحوّله إلى أسطر حقيقية
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      },
      appName
    );
  return getAuth(app);
}

// الـ middleware — يستبدل requireAuth القديم
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: {
    user: {
      uid: string;
      email: string;
      name: string;
    };
  };
}>(async (c, next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing token" }, 401);
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const auth = getFirebaseAuth(c.env);
    const decodedToken = await auth.verifyIdToken(token);

    // نخزّن بيانات المستخدم في سياق Hono
    c.set("user", {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      name: decodedToken.name || "",
    });

    await next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return c.json({ error: "Unauthorized: Invalid token" }, 401);
  }
});
