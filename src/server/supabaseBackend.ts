import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface BackendEnv {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  DATABASE_URL?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  ALLOW_DEV_MOCKS?: string | boolean;
}

export interface BackendReadinessReport {
  isProduction: boolean;
  isConfigured: boolean;
  allowDevMocks: boolean;
  status: 'PRODUCTION_READY' | 'DEV_MOCK_ACTIVE' | 'CONFIGURATION_BLOCKED';
  checks: {
    supabaseUrl: boolean;
    serviceRoleKey: boolean;
    anonKey: boolean;
    databaseUrlOptional: boolean;
  };
  missingRequiredKeys: string[];
}

export class BackendConfigurationError extends Error {
  public statusCode: number;
  public errorAr: string;
  public errorEn: string;

  constructor(message: string, errorAr?: string) {
    super(message);
    this.name = 'BackendConfigurationError';
    this.statusCode = 503;
    this.errorEn = message;
    this.errorAr =
      errorAr ||
      'الخدمة غير متوفرة: لم يتم إعداد قاعدة البيانات الإنتاجية بشكل صحيح.';
  }
}

export function extractBackendEnv(explicitEnv?: BackendEnv): BackendEnv {
  const nodeEnv = typeof process !== 'undefined' && process.env ? process.env : {};
  return {
    SUPABASE_URL:
      explicitEnv?.SUPABASE_URL ||
      nodeEnv.SUPABASE_URL ||
      explicitEnv?.VITE_SUPABASE_URL ||
      nodeEnv.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:
      explicitEnv?.SUPABASE_SERVICE_ROLE_KEY ||
      nodeEnv.SUPABASE_SERVICE_ROLE_KEY ||
      explicitEnv?.SUPABASE_SECRET_KEY ||
      nodeEnv.SUPABASE_SECRET_KEY,
    SUPABASE_ANON_KEY:
      explicitEnv?.SUPABASE_ANON_KEY ||
      nodeEnv.SUPABASE_ANON_KEY ||
      explicitEnv?.SUPABASE_PUBLISHABLE_KEY ||
      nodeEnv.SUPABASE_PUBLISHABLE_KEY ||
      explicitEnv?.VITE_SUPABASE_ANON_KEY ||
      nodeEnv.VITE_SUPABASE_ANON_KEY,
    DATABASE_URL: explicitEnv?.DATABASE_URL || nodeEnv.DATABASE_URL,
    NODE_ENV: explicitEnv?.NODE_ENV || explicitEnv?.ENVIRONMENT || nodeEnv.NODE_ENV || nodeEnv.ENVIRONMENT,
    ALLOW_DEV_MOCKS:
      explicitEnv?.ALLOW_DEV_MOCKS !== undefined
        ? explicitEnv.ALLOW_DEV_MOCKS
        : nodeEnv.ALLOW_DEV_MOCKS,
  };
}

export function getBackendReadiness(explicitEnv?: BackendEnv): BackendReadinessReport {
  const env = extractBackendEnv(explicitEnv);

  const envStr = (env.NODE_ENV || 'development').toLowerCase();
  const isProduction = envStr === 'production';

  const hasValidUrl = Boolean(
    env.SUPABASE_URL &&
    !env.SUPABASE_URL.includes('placeholder') &&
    env.SUPABASE_URL.startsWith('https://')
  );

  const hasValidServiceRole = Boolean(
    env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder') &&
    env.SUPABASE_SERVICE_ROLE_KEY.length > 20
  );

  const hasValidAnonKey = Boolean(
    env.SUPABASE_ANON_KEY &&
    !env.SUPABASE_ANON_KEY.includes('placeholder') &&
    env.SUPABASE_ANON_KEY.length > 20
  );

  const missingKeys: string[] = [];
  if (!hasValidUrl) missingKeys.push('SUPABASE_URL');
  if (!hasValidServiceRole) missingKeys.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!hasValidAnonKey) missingKeys.push('SUPABASE_ANON_KEY');

  const isConfigured = missingKeys.length === 0;

  // In production, dev mocks are strictly disallowed unless explicitly overridden
  const allowDevMocks =
    !isProduction ||
    String(env.ALLOW_DEV_MOCKS).toLowerCase() === 'true';

  let status: BackendReadinessReport['status'] = 'CONFIGURATION_BLOCKED';
  if (isConfigured) {
    status = 'PRODUCTION_READY';
  } else if (!isProduction && allowDevMocks) {
    status = 'DEV_MOCK_ACTIVE';
  }

  return {
    isProduction,
    isConfigured,
    allowDevMocks,
    status,
    checks: {
      supabaseUrl: hasValidUrl,
      serviceRoleKey: hasValidServiceRole,
      anonKey: hasValidAnonKey,
      databaseUrlOptional: Boolean(env.DATABASE_URL),
    },
    missingRequiredKeys: missingKeys,
  };
}

export function assertProductionBackendReady(explicitEnv?: BackendEnv): void {
  const readiness = getBackendReadiness(explicitEnv);
  if (readiness.isProduction && !readiness.isConfigured) {
    throw new BackendConfigurationError(
      `Production database connection failed: Missing [${readiness.missingRequiredKeys.join(', ')}]. Silent mock fallback is prohibited in production.`
    );
  }
}

export function getSupabaseAdminClient(explicitEnv?: BackendEnv): SupabaseClient | null {
  const env = extractBackendEnv(explicitEnv);
  const readiness = getBackendReadiness(explicitEnv);

  if (!readiness.isConfigured) {
    if (readiness.isProduction) {
      throw new BackendConfigurationError(
        `Production database is not configured. Missing required Supabase credentials: ${readiness.missingRequiredKeys.join(', ')}`
      );
    }
    // Return null in development mock mode so caller uses mock store explicitly
    return null;
  }

  return createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
