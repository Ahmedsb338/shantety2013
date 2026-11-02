import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getBackendReadiness, BackendConfigurationError, BackendEnv } from "../server/supabaseBackend";

export function getDb(env?: BackendEnv & { HYPERDRIVE?: { connectionString: string }; [key: string]: any }) {
  const readiness = getBackendReadiness(env);
  const connectionString =
    process.env.DATABASE_URL ||
    env?.DATABASE_URL ||
    env?.HYPERDRIVE?.connectionString;

  if (!connectionString) {
    if (readiness.isProduction && !readiness.allowDevMocks) {
      throw new BackendConfigurationError(
        'DATABASE_URL or Hyperdrive connection string is required in production environment'
      );
    }

    // Graceful offline mock fallback ONLY when in development and mocks are permitted
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async (d: any) => d?.data ?? {},
      update: async (d: any) => d?.data ?? {},
      delete: async () => ({}),
    };

    const mockDb = new Proxy({}, {
      get: (_, prop) => {
        if (prop === 'query') return new Proxy({}, { get: () => noOp });
        if (prop === 'select') return () => ({ from: () => ({ limit: () => [] }) });
        if (prop === 'insert') return () => ({
          values: () => ({
            onConflictDoNothing: async () => {},
            onConflictDoUpdate: () => ({ returning: async () => [] }),
            returning: async () => [],
          }),
        });
        return async () => [];
      },
    });

    const mockPool = {
      query: async () => ({ rows: [] }),
      connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
      end: async () => {},
    };

    return { db: mockDb as any, pool: mockPool as any };
  }

  try {
    const pool = new Pool({
      connectionString,
      ssl: connectionString.includes("supabase.co") || connectionString.includes("pooler")
        ? { rejectUnauthorized: false }
        : undefined,
    });
    const db = drizzle(pool);
    return { db, pool };
  } catch (err: any) {
    if (readiness.isProduction && !readiness.allowDevMocks) {
      throw new BackendConfigurationError(
        `PostgreSQL connection initialization failed in production: ${err.message}`
      );
    }
    console.warn('[Database] PostgreSQL connection initialization failed in dev, returning mock', err);
    const mockPool = {
      query: async () => ({ rows: [] }),
      connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
      end: async () => {},
    };
    return { db: {} as any, pool: mockPool as any };
  }
}

