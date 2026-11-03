import { supabase, isSupabaseConfigured } from './supabase';

export interface SupabaseEnvCheck {
  isSet: boolean;
  isPlaceholder: boolean;
  maskedValue: string;
  length: number;
}

export interface SupabaseDiagnosticResult {
  isConnected: boolean;
  isConfigured: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'UNCONFIGURED' | 'DEGRADED';
  url: SupabaseEnvCheck;
  anonKey: SupabaseEnvCheck;
  latencyMs?: number;
  messageAr: string;
  messageEn: string;
  errorMessage?: string;
  timestamp: string;
}

/**
 * Safely masks a Supabase Project URL so internal IDs are not leaked.
 * Example: https://mziomwhluwjtadchnxdz.supabase.co -> https://mzi***xdz.supabase.co
 */
export function maskSupabaseUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return '[NOT_INITIALIZED]';
  }
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    const parts = host.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      const maskedSub = subdomain.length > 6
        ? `${subdomain.slice(0, 3)}***${subdomain.slice(-3)}`
        : '***';
      return `${parsed.protocol}//${maskedSub}.${parts.slice(1).join('.')}`;
    }
    return `${parsed.protocol}//${host.slice(0, 4)}***.${parts.slice(-1)}`;
  } catch {
    return trimmed.length > 8 ? `${trimmed.slice(0, 6)}***` : '***';
  }
}

/**
 * Safely masks a Supabase anon public key without exposing token payload or signatures.
 * Example: eyJhbGciOi...[MASKED, len=218]...4f9a
 */
export function maskSupabaseAnonKey(key?: string | null): string {
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return '[NOT_INITIALIZED]';
  }
  const trimmed = key.trim();
  if (trimmed.length <= 16) {
    return '***[MASKED]***';
  }
  const prefix = trimmed.slice(0, 8);
  const suffix = trimmed.slice(-4);
  return `${prefix}...[MASKED_JWT, len=${trimmed.length}]...${suffix}`;
}

/**
 * Validates whether the browser Supabase environment variables are properly initialized.
 */
export function checkBrowserSupabaseEnv(): {
  urlCheck: SupabaseEnvCheck;
  anonKeyCheck: SupabaseEnvCheck;
  isConfigured: boolean;
} {
  const getEnv = (key: string): string | undefined => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  };

  const rawUrl = getEnv('VITE_SUPABASE_URL');
  const rawKey = getEnv('VITE_SUPABASE_ANON_KEY');

  const urlIsSet = Boolean(rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '');
  const urlIsPlaceholder = Boolean(
    !urlIsSet ||
    rawUrl?.includes('placeholder') ||
    rawUrl?.includes('your-project') ||
    rawUrl?.includes('example')
  );

  const keyIsSet = Boolean(rawKey && typeof rawKey === 'string' && rawKey.trim() !== '');
  const keyIsPlaceholder = Boolean(
    !keyIsSet ||
    rawKey?.includes('placeholder') ||
    rawKey?.includes('your-anon-key') ||
    (rawKey && rawKey.length < 30)
  );

  const urlCheck: SupabaseEnvCheck = {
    isSet: urlIsSet,
    isPlaceholder: urlIsPlaceholder,
    maskedValue: maskSupabaseUrl(rawUrl),
    length: rawUrl ? rawUrl.length : 0,
  };

  const anonKeyCheck: SupabaseEnvCheck = {
    isSet: keyIsSet,
    isPlaceholder: keyIsPlaceholder,
    maskedValue: maskSupabaseAnonKey(rawKey),
    length: rawKey ? rawKey.length : 0,
  };

  const configured = urlIsSet && !urlIsPlaceholder && keyIsSet && !keyIsPlaceholder;

  return {
    urlCheck,
    anonKeyCheck,
    isConfigured: configured,
  };
}

/**
 * Verifies active browser connection to Supabase via lightweight ping query.
 * Logs connection diagnostics safely to the browser console without exposing secrets.
 */
export async function verifySupabaseConnection(options?: {
  silentLog?: boolean;
}): Promise<SupabaseDiagnosticResult> {
  const timestamp = new Date().toISOString();
  const envCheck = checkBrowserSupabaseEnv();

  if (!envCheck.isConfigured) {
    const result: SupabaseDiagnosticResult = {
      isConnected: false,
      isConfigured: false,
      status: 'UNCONFIGURED',
      url: envCheck.urlCheck,
      anonKey: envCheck.anonKeyCheck,
      messageAr: 'متغيرات بيئة Supabase غير مهيأة في المتصفح أو تستخدم قيماً مؤقتة.',
      messageEn: 'Supabase browser environment variables are missing or set to placeholders.',
      errorMessage: 'Missing valid VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY',
      timestamp,
    };

    if (!options?.silentLog) {
      logSupabaseDiagnostics(result);
    }
    return result;
  }

  const start = performance.now();

  try {
    // Attempt a lightweight ping: 1. check auth session, 2. check public read of categories
    const sessionPromise = supabase.auth.getSession();
    const queryPromise = supabase.from('categories').select('id').limit(1);

    // Timeout protection: 5000ms
    const timeoutPromise = new Promise<{ timeout: true }>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase connection timeout (5000ms)')), 5000)
    );

    const [sessionRes, queryRes] = await Promise.race([
      Promise.all([sessionPromise, queryPromise]),
      timeoutPromise.then(() => {
        throw new Error('Supabase ping timed out');
      }),
    ]);

    const latencyMs = Math.round(performance.now() - start);

    // If query failed due to table absence or permission, check if auth endpoint responded
    const hasQueryError = Boolean(queryRes.error);
    const isDegraded = hasQueryError && !sessionRes.error;

    const result: SupabaseDiagnosticResult = {
      isConnected: !hasQueryError || !sessionRes.error,
      isConfigured: true,
      status: isDegraded ? 'DEGRADED' : 'CONNECTED',
      url: envCheck.urlCheck,
      anonKey: envCheck.anonKeyCheck,
      latencyMs,
      messageAr: isDegraded
        ? 'تم الاتصال بخادم Supabase Auth لكن استعلام الجداول أعاد تنبيهاً.'
        : 'الاتصال بقاعدة بيانات Supabase نشط ومستقر.',
      messageEn: isDegraded
        ? 'Connected to Supabase Auth; catalog table query returned a notice.'
        : 'Active and healthy connection to Supabase database verified.',
      errorMessage: queryRes.error ? queryRes.error.message : undefined,
      timestamp,
    };

    if (!options?.silentLog) {
      logSupabaseDiagnostics(result);
    }
    return result;
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    const result: SupabaseDiagnosticResult = {
      isConnected: false,
      isConfigured: true,
      status: 'DISCONNECTED',
      url: envCheck.urlCheck,
      anonKey: envCheck.anonKeyCheck,
      latencyMs,
      messageAr: 'تعذر الاتصال بخادم Supabase. تحقق من اتصال الشبكة وإعدادات CORS.',
      messageEn: 'Failed to connect to Supabase. Check network connectivity and CORS settings.',
      errorMessage: err?.message || 'Connection failure',
      timestamp,
    };

    if (!options?.silentLog) {
      logSupabaseDiagnostics(result);
    }
    return result;
  }
}

/**
 * Safely outputs connection status to console without leaking secret tokens.
 */
export function logSupabaseDiagnostics(result: SupabaseDiagnosticResult): void {
  const isHealthy = result.isConnected && result.status === 'CONNECTED';
  const badgeStyle = isHealthy
    ? 'background: #059669; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;'
    : result.status === 'DEGRADED'
    ? 'background: #D97706; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;'
    : 'background: #DC2626; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;';

  console.groupCollapsed(
    `%c[Shantety]%c Supabase Status: %c${result.status}%c (${result.latencyMs ?? 0}ms)`,
    'color: #E10600; font-weight: bold;',
    'color: inherit;',
    badgeStyle,
    'color: #888;'
  );

  console.info('Diagnostic Report:', {
    status: result.status,
    connected: result.isConnected,
    configured: result.isConfigured,
    url: result.url.maskedValue,
    urlValid: !result.url.isPlaceholder && result.url.isSet,
    anonKey: result.anonKey.maskedValue,
    anonKeyValid: !result.anonKey.isPlaceholder && result.anonKey.isSet,
    latencyMs: result.latencyMs,
    error: result.errorMessage ?? 'None',
    timestamp: result.timestamp,
  });

  console.info('Summary (AR):', result.messageAr);
  console.info('Summary (EN):', result.messageEn);
  console.groupEnd();
}
