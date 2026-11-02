import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStore } from '../context/StoreContext';
import { OFFICIAL_BRAND } from '../data/initialData';
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';

export const AdminGate: React.FC = () => {
  const { language, setCurrentView, showToast } = useStore();
  const { login, isLoading } = useAdminAuth();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const email = adminEmail.trim().toLowerCase();
    const pass = adminPassword.trim();

    if (!email || !pass) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, pass);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || (language === 'ar' ? 'فشل تسجيل الدخول كمسؤول' : 'Admin authentication failed'));
    } else {
      showToast(
        language === 'ar' ? 'تم تسجيل الدخول بنجاح إلى لوحة الإدارة' : 'Authenticated as Administrator',
        'success'
      );
    }
  };

  const loadOwnerDemo = () => {
    setAdminEmail('shantety2013@gmail.com');
    setAdminPassword('owner2026');
    setErrorMsg(null);
  };

  const loadManagerDemo = () => {
    setAdminEmail('manager@shantety.com');
    setAdminPassword('manager2026');
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
            {language === 'ar' ? 'بوابة الإدارة الآمنة (Supabase Auth RBAC)' : 'Secure Admin Portal'}
          </span>
          <h1 className="text-2xl font-black mt-1 text-white">
            {language === 'ar' ? 'لوحة تحكم إدارة شنطتي' : 'Shantety Commerce Manager'}
          </h1>
          <p className="text-xs text-stone-400 mt-2 leading-relaxed">
            {language === 'ar'
              ? 'مصادقة مشفرة عبر Supabase Auth مع التحقق التلقائي من الصلاحيات وأدوار الإدارة من الخادم.'
              : 'Server-authorized Supabase authentication for store owners, managers, and fulfillment staff.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl flex items-start gap-3 text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-300">
              {language === 'ar' ? 'البريد الإلكتروني المعتمد للإدارة *' : 'Authorized Admin Email *'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="as0246135@gmail.com أو admin@shantety.com"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl py-3 ps-10 pe-4 text-sm text-white placeholder-stone-600 focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-300">
              {language === 'ar' ? 'كلمة المرور *' : 'Password *'}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-500 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl py-3 ps-10 pe-4 text-sm text-white placeholder-stone-600 focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="w-full bg-[#E10600] hover:bg-[#c20500] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isSubmitting
                ? (language === 'ar' ? 'جاري التحقق من الصلاحيات...' : 'Verifying RBAC permissions...')
                : (language === 'ar' ? 'تسجيل الدخول للوحة الإدارة' : 'Authenticate & Enter Dashboard')}
            </span>
          </button>

          {/* Quick Pre-fill Chips */}
          <div className="pt-3 border-t border-stone-800 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-[10px] text-stone-500">
              {language === 'ar' ? 'حسابات تجريبية سريعة:' : 'Quick test accounts:'}
            </span>
            <button
              type="button"
              onClick={loadOwnerDemo}
              className="text-[11px] text-stone-400 hover:text-white bg-stone-800 px-2.5 py-1 rounded-md transition-colors"
            >
              {language === 'ar' ? 'مالك المتجر (Owner)' : 'Owner'}
            </button>
            <button
              type="button"
              onClick={loadManagerDemo}
              className="text-[11px] text-stone-400 hover:text-white bg-stone-800 px-2.5 py-1 rounded-md transition-colors"
            >
              {language === 'ar' ? 'مدير الفروع (Manager)' : 'Manager'}
            </button>
          </div>
        </form>

        {/* Back to store */}
        <div className="mt-8 pt-6 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
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
