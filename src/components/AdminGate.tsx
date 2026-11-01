import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStore } from '../context/StoreContext';
import { OFFICIAL_BRAND } from '../data/initialData';
import { ShieldCheck, Lock, KeyRound, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AdminGate: React.FC = () => {
  const { language, setCurrentView } = useStore();
  const { loginWithGoogle, loginWithPasskey, isLoading } = useAdminAuth();
  const [passkeyInput, setPasskeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    const res = await loginWithGoogle();
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handlePasskeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyInput.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رمز المرور الإداري' : 'Please enter admin passkey');
      return;
    }
    const res = loginWithPasskey(passkeyInput);
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  const fillQuickPasskey = () => {
    setPasskeyInput('01010070812');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 sm:p-6 text-stone-100">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#E10600] via-amber-500 to-[#E10600]" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#E10600]/10 border border-[#E10600]/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#E10600]">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-xs uppercase tracking-widest text-[#E10600] font-bold">
            {language === 'ar' ? 'بوابة الإدارة الآمنة' : 'Secure Admin Portal'}
          </span>
          <h1 className="text-2xl font-black mt-1 text-white">
            {language === 'ar' ? 'لوحة تحكم إدارة شنطتي' : 'Shantety Commerce Manager'}
          </h1>
          <p className="text-xs text-stone-400 mt-2 leading-relaxed">
            {language === 'ar'
              ? 'هذه الصفحة مخصصة فقط للمسؤولين المصرح لهم بمتابعة المخزون والطلبات والمنتجات والتحليلات.'
              : 'Restricted area reserved strictly for authorized store owners, inventory managers, and staff.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl flex items-start gap-3 text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Login Method 1: Google OAuth */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || isSubmitting}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-100 text-stone-900 font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-98 disabled:opacity-50 text-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {language === 'ar' ? 'تسجيل الدخول كمسؤول عبر Google' : 'Sign In with Authorized Google Account'}
            </span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-stone-800 w-full" />
            <span className="bg-stone-900 px-3 text-[11px] text-stone-500 font-semibold uppercase tracking-wider absolute">
              {language === 'ar' ? 'أو الدخول السريع بالرمز الإداري' : 'Or Admin Passkey'}
            </span>
          </div>

          {/* Login Method 2: Passkey */}
          <form onSubmit={handlePasskeySubmit} className="space-y-3">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-500 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder={language === 'ar' ? 'أدخل رمز مرور الإدارة (PIN)' : 'Enter Admin Passkey'}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl py-3 ps-10 pe-4 text-sm text-white placeholder-stone-600 focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#E10600] hover:bg-[#c20500] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'ar' ? 'تأكيد الدخول كمدير' : 'Verify & Enter Dashboard'}</span>
            </button>

            {/* Quick Demo Fill */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={fillQuickPasskey}
                className="text-[11px] text-stone-400 hover:text-white underline transition-colors"
              >
                {language === 'ar'
                  ? 'تجربة سريعة للمالك (رقم المتجر الرسمي: 01010070812)'
                  : 'Quick test with Official Hotline Passkey'}
              </button>
            </div>
          </form>
        </div>

        {/* Back to store */}
        <div className="mt-8 pt-6 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            {language === 'ar' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{language === 'ar' ? 'العودة لواجهة المتجر الرئيسية' : 'Return to Storefront'}</span>
          </button>
          <span className="text-stone-500 text-[10px]">
            {OFFICIAL_BRAND.branches[0].city_ar} - {OFFICIAL_BRAND.branches[0].governorate_ar}
          </span>
        </div>
      </div>
    </div>
  );
};
