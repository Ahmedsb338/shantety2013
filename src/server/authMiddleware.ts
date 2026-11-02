import { getSupabaseAdminClient, getBackendReadiness, BackendEnv } from './supabaseBackend';
import { authoritativeStore } from './commerceService';

export interface VerifiedAdminUser {
  uid: string;
  email: string;
  role: 'super_admin' | 'store_manager' | 'order_staff';
  isOwner: boolean;
  isActive: boolean;
}

export interface AuthVerificationResult {
  isAuthorized: boolean;
  statusCode?: number;
  error?: string;
  errorAr?: string;
  user?: VerifiedAdminUser;
}

export async function verifyAdminRequest(
  authHeader: string | undefined,
  fallbackAdminEmail?: string,
  explicitEnv?: BackendEnv
): Promise<AuthVerificationResult> {
  const readiness = getBackendReadiness(explicitEnv);

  const cleanHeader = (authHeader || '').trim();
  const token = cleanHeader.startsWith('Bearer ') ? cleanHeader.slice(7).trim() : null;

  // 1. Production Mode: Token is MANDATORY
  if (readiness.isProduction && !token) {
    return {
      isAuthorized: false,
      statusCode: 401,
      error: 'Unauthorized: Production administrative requests require an authenticated Supabase Bearer token',
      errorAr: 'غير مصرح: تتطلب لوحة الإدارة في بيئة الإنتاج جلسة دخول معتمدة ورمز أمان صالح.',
    };
  }

  // 2. Production Mode: Credentials must exist to verify token
  if (readiness.isProduction && !readiness.isConfigured) {
    return {
      isAuthorized: false,
      statusCode: 503,
      error: `Service Unavailable: Production database is not configured. Missing [${readiness.missingRequiredKeys.join(', ')}]`,
      errorAr: 'الخدمة غير متوفرة: لم يتم إعداد قاعدة البيانات الإنتاجية بالشكل الصحيح.',
    };
  }

  let supabase: any = null;
  try {
    supabase = getSupabaseAdminClient(explicitEnv);
  } catch (err: any) {
    return {
      isAuthorized: false,
      statusCode: 503,
      error: err.message,
    };
  }

  // 3. Real Supabase Token Verification (when Supabase is configured)
  if (supabase && token) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user || !user.email) {
        return {
          isAuthorized: false,
          statusCode: 401,
          error: 'Unauthorized: Invalid or expired Supabase authentication session',
          errorAr: 'جلسة الدخول منتهية الصلاحية أو غير صالحة. يرجى تسجيل الدخول مجدداً.',
        };
      }

      const email = user.email.toLowerCase().trim();

      // Query authoritative database admin memberships
      const { data: membership, error: memberError } = await supabase
        .from('admin_memberships')
        .select('user_id, email, role, is_active, is_owner')
        .or(`user_id.eq.${user.id},email.eq.${email}`)
        .maybeSingle();

      if (memberError || !membership) {
        // Fallback check if caller is the immutable owner
        if (email === 'shantety2013@gmail.com') {
          return {
            isAuthorized: true,
            user: {
              uid: user.id,
              email,
              role: 'super_admin',
              isOwner: true,
              isActive: true,
            },
          };
        }
        return {
          isAuthorized: false,
          statusCode: 403,
          error: 'Forbidden: Account is not registered in authoritative administrative memberships',
          errorAr: 'الحساب غير مسجل في قائمة المشرفين المصرح لهم.',
        };
      }

      if (!membership.is_active) {
        return {
          isAuthorized: false,
          statusCode: 403,
          error: 'Forbidden: Administrator account has been deactivated',
          errorAr: 'تم تعطيل صلاحيات هذا الحساب الإداري من قبل مالك المتجر.',
        };
      }

      const isOwner =
        email === 'shantety2013@gmail.com' ||
        Boolean(membership.is_owner);

      return {
        isAuthorized: true,
        user: {
          uid: membership.user_id || user.id,
          email,
          role: membership.role as any,
          isOwner,
          isActive: true,
        },
      };
    } catch (err: any) {
      return {
        isAuthorized: false,
        statusCode: 500,
        error: `Authentication verification failure: ${err.message}`,
      };
    }
  }

  // 3. Isolated Development Mock Mode (Only if NOT production and ALLOW_DEV_MOCKS is enabled)
  if (!readiness.isProduction && readiness.allowDevMocks) {
    const candidateEmail = (token ? token : fallbackAdminEmail || '').toLowerCase().trim();

    // Check authoritative store verified members
    const verified = authoritativeStore.verifyAdminRole(candidateEmail);
    if (verified.isAuthorized && verified.role) {
      return {
        isAuthorized: true,
        user: {
          uid: 'dev-admin-' + candidateEmail.split('@')[0],
          email: candidateEmail,
          role: verified.role as any,
          isOwner: Boolean(verified.isOwner),
          isActive: true,
        },
      };
    }
  }

  return {
    isAuthorized: false,
    statusCode: 401,
    error: 'Unauthorized: Missing or invalid administrative credentials',
    errorAr: 'بيانات الاعتماد الإدارية غير صالحة أو غير متوفرة.',
  };
}
