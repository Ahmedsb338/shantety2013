// ─── src/db/index.ts (النسخة الجديدة لـ Workers + Hyperdrive) ──────
//
// على Workers، لا نستخدم process.env.DATABASE_URL.
// بدلاً من ذلك، ننشئ الاتصال من Hyperdrive في كل طلب.
//
// هذا الملف يصدّر دالة getDb(env) بدلاً من ثابت db.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export function getDb(env: { HYPERDRIVE: Hyperdrive }) {
  const pool = new Pool({
    connectionString: env.HYPERDRIVE.connectionString,
  });
  const db = drizzle(pool);
  return { db, pool };
}
