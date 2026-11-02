import { getDb } from "./index";
import { users } from "./schema";

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName: string | undefined,
  env?: any
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
