import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export function getDb(env?: { HYPERDRIVE?: { connectionString: string } }) {
  const connectionString =
    process.env.DATABASE_URL ||
    env?.HYPERDRIVE?.connectionString ||
    "postgresql://postgres:postgres@localhost:5432/postgres";

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("supabase.co") || connectionString.includes("pooler")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const db = drizzle(pool);
  return { db, pool };
}
