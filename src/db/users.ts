// ─── src/db/users.ts (محوّل لـ Workers + Hyperdrive) ──────────────

import { getDb } from "./index.ts";
import { users } from "./schema.ts";

type Env = { HYPERDRIVE: Hyperdrive };

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName: string | undefined,
  env: Env
) {
  const { db, pool } = getDb(env);
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
        },
      })
      .returning();

    return result[0];
  } finally {
    await pool.end();
  }
}
