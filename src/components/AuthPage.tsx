import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { StoreDatabase } from '../services/storeDatabase';
import { OFFICIAL_BRAND, EGYPTIAN_GOVERNORATES } from '../data/initialData';
import {
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  SlidersHorizontal,
  PackageCheck,
  Heart,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { language, setCurrentView, showToast } = useStore();
  const { currentUser, isAuthenticated, login, logout } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign Up Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [regError, setRegError] = useState<string | null>(null);

  // Customer local session state
  const [customerUser, setCustomerUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('shanaty_customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Fast Manager Login Helper
  const handleFastAdminLogin = async () => {
    setLoginEmail('admin@shantety.com');
    setLoginPassword('shantety2026');
    setLoginError(null);
    setIsSubmitting(true);

    const success = await login('admin@shantety.com', 'shantety2026');
    setIsSubmitting(false);

    if (success) {
      showToast(
        language === 'ar' ? 'مرحباً بك يا مدير المتجر! تم تسجيل الدخول بنجاح' : 'Welcome Admin! Logged in successfully',
        'success'
      );
      setCurrentView('admin');
    } else {
      setLoginError(language === 'ar' ? 'تعذر تسجيل دخول الإدارة' : 'Failed to login as admin');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!cleanEmail || !pass) {
      setLoginError(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      return;
    }

    setIsSubmitting(true);

    // 1. Check if manager credentials
    const isAdmin = await login(cleanEmail, pass);
    if (isAdmin) {
      setIsSubmitting(false);
      showToast(
        language === 'ar' ? 'تم تسجيل دخول المدير بنجاح!' : 'Admin logged in successfully!',
        'success'
      );
      setCurrentView('admin');
      return;
    }

    // 2. Check customer registered credentials
    const customers = StoreDatabase.getCustomers();
    const matched = customers.find(
      (c) => c.email.toLowerCase() === cleanEmail || c.phone === cleanEmail
    );

    setIsSubmitting(false);

    if (matched) {
      const custObj = {
        name: matched.name,
        email: matched.email,
        phone: matched.phone,
        governorate: matched.governorate,
      };
      localStorage.setItem('shanaty_customer_user', JSON.stringify(custObj));
      setCustomerUser(custObj);
      showToast(
        language === 'ar' ? `أهلاً بك يا ${matched.name}` : `Welcome ${matched.name}`,
        'success'
      );
    } else {
      // Allow seamless guest-customer login
      const custObj = {
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '01012345678',
        governorate: 'القاهرة',
      };
      localStorage.setItem('shanaty_customer_user', JSON.stringify(custObj));
      setCustomerUser(custObj);
      showToast(
        language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully',
        'success'
      );
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!fullName.trim() || !phone.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('01') || cleanPhone.length !== 11) {
      setRegError(
        language === 'ar'
          ? 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01 ويتكون من 11 رقماً'
          : 'Please enter a valid 11-digit Egyptian phone number'
      );
      return;
    }

    const newCustomer = StoreDatabase.registerCustomer({
      name: fullName.trim(),
      phone: cleanPhone,
      email: regEmail.trim(),
      governorate,
      password: regPassword,
    });

    const custObj = {
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      governorate: newCustomer.governorate,
    };
    localStorage.setItem('shanaty_customer_user', JSON.stringify(custObj));
    setCustomerUser(custObj);

    showToast(
      language === 'ar'
        ? `تم إنشاء حسابك بنجاح! أهلاً بك يا ${fullName}`
        : `Account created successfully! Welcome ${fullName}`,
      'success'
    );
  };

  const handleCustomerLogout = () => {
    localStorage.removeItem('shanaty_customer_user');
    setCustomerUser(null);
    if (isAuthenticated) {
      logout();
    }
    showToast(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out', 'info');
  };

  // If user is logged in (either Admin or Customer)
  if (isAuthenticated || customerUser) {
    const userDisplayName = currentUser ? currentUser.displayName : customerUser.name;
    const userEmail = currentUser ? currentUser.email : customerUser.email;
    const roleTitle = currentUser
      ? (language === 'ar' ? currentUser.roleTitleAr : currentUser.roleTitleEn)
      : (language === 'ar' ? 'عميل مميز' : 'Preferred Customer');

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 animate-fadeIn text-xs">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-[#18181B] text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#E10600] flex items-center justify-center text-white font-bold text-lg">
                {userDisplayName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black">{userDisplayName}</h2>
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px]">
                    {roleTitle}
                  </span>
                </div>
                <p className="text-stone-400 text-xs">{userEmail}</p>
              </div>
            </div>

            <button
              onClick={handleCustomerLogout}
              className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>{language === 'ar' ? 'خروج' : 'Logout'}</span>
            </button>
          </div>

          {/* Body actions */}
          <div className="p-6 space-y-5">
            {/* If Admin / Manager, prominent button to enter Control Panel */}
            {isAuthenticated && (
              <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E10600] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 block text-sm">
                      {language === 'ar' ? 'لوحة تحكم وإدارة المتجر (Admin Control Panel)' : 'Admin Control Panel'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {language === 'ar'
                        ? 'إدارة المنتجات، الأسعار، الفئات، شركات الشحن والتحليلات'
                        : 'Manage products, prices, categories, carriers and visitor analytics'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentView('admin')}
                  className="py-2.5 px-5 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
                >
                  <span>{language === 'ar' ? 'فتح لوحة الإدارة' : 'Open Dashboard'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            )}

            {/* Quick Customer Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setCurrentView('order-tracking')}
                className="p-4 rounded-xl border border-stone-200 hover:border-[#E10600] bg-stone-50/50 hover:bg-white text-start transition-all cursor-pointer flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 text-stone-700 group-hover:text-[#E10600] flex items-center justify-center shrink-0">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 block text-xs">
                    {language === 'ar' ? 'تتبع شحناتي المباشرة' : 'Track My Orders'}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {language === 'ar' ? 'متابعة حالة التوصيل مع بوسطة ومايلرز' : 'Live tracking with Bosta & Mylerz'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setCurrentView('wishlist')}
                className="p-4 rounded-xl border border-stone-200 hover:border-[#E10600] bg-stone-50/50 hover:bg-white text-start transition-all cursor-pointer flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 text-stone-700 group-hover:text-[#E10600] flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 block text-xs">
                    {language === 'ar' ? 'قائمة المنتجات المفضلة' : 'My Saved Wishlist'}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {language === 'ar' ? 'الشنط والأحذية التي قمت بحفظها' : 'Saved items and favorites'}
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setCurrentView('shop')}
                className="text-[#E10600] hover:underline font-bold text-xs cursor-pointer inline-flex items-center gap-1"
              >
                <span>{language === 'ar' ? 'تصفح تشكيلة شنطتي الكاملة' : 'Continue Shopping'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 animate-fadeIn text-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Brand Top Header */}
        <div className="bg-[#18181B] text-white p-6 text-center space-y-2 border-b border-stone-800">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white p-0.5 border border-stone-700 mx-auto">
            <img
              src={OFFICIAL_BRAND.logo_white}
              alt="Shantety"
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">
              {language === 'ar' ? 'متجر شنطتي (Shantety)' : 'Shantety Portal'}
            </h1>
            <p className="text-[11px] text-stone-400">
              {language === 'ar'
                ? 'بوابة تسجيل الدخول للعملاء وإدارة المتجر'
                : 'Customer Account & Management Access'}
            </p>
          </div>
        </div>

        {/* Tabs: Sign In vs Sign Up */}
        <div className="flex border-b border-stone-200 bg-stone-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setLoginError(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'signin'
                ? 'border-[#E10600] text-[#E10600] bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setRegError(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'border-[#E10600] text-[#E10600] bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            {language === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* TAB 1: SIGN IN */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 animate-fadeIn">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Fast Admin Login Demo Chip */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E10600] shrink-0" />
                  <span className="text-[11px] font-bold text-amber-900 leading-tight">
                    {language === 'ar' ? 'هل أنت مدير المتجر؟' : 'Store Administrator?'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFastAdminLogin}
                  className="py-1 px-2.5 bg-stone-900 hover:bg-[#E10600] text-white font-bold rounded-lg text-[10px] cursor-pointer transition-colors shrink-0"
                >
                  {language === 'ar' ? 'دخول فوري كمدير ⚡' : 'Auto-Login Admin ⚡'}
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">
                  {language === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف *' : 'Email or Phone *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@shantety.com أو 01012345678"
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800">
                    {language === 'ar' ? 'كلمة المرور *' : 'Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-stone-400 hover:text-stone-600 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 rtl:left-auto rtl:right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-stone-600">
                  <input type="checkbox" defaultChecked className="rounded text-[#E10600] focus:ring-[#E10600]" />
                  <span>{language === 'ar' ? 'تذكر بيانات الدخول' : 'Remember me'}</span>
                </label>

                <a
                  href={`https://wa.me/201026042168?text=${encodeURIComponent('مرحباً، أود استعادة كلمة المرور لحسابي في متجر شنطتي')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E10600] hover:underline"
                >
                  {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </a>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? (language === 'ar' ? 'جاري التحقق...' : 'Signing In...')
                    : (language === 'ar' ? 'تسجيل الدخول للمتجر' : 'Sign In')}
                </span>
              </button>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5 animate-fadeIn">
              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-stone-800">
                  {language === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: ياسمين خيري"
                  className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">
                  {language === 'ar' ? 'رقم الهاتف المصري *' : 'Egyptian Phone *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full p-2.5 rounded-lg border border-stone-300 font-mono focus:outline-none focus:border-[#E10600]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">
                  {language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">
                  {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
                </label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#E10600]"
                >
                  {EGYPTIAN_GOVERNORATES.map((g) => (
                    <option key={g.name_ar} value={g.name_ar}>
                      {language === 'ar' ? g.name_ar : g.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">
                  {language === 'ar' ? 'كلمة المرور *' : 'Password *'}
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'ar' ? 'إنشاء حساب جديد' : 'Create My Account'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
