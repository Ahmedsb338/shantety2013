import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
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
  Plus,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { language, setCurrentView, showToast } = useStore();
  const {
    customer,
    isAuthenticated: isCustomerAuth,
    login: customerLogin,
    register: customerRegister,
    logout: customerLogout,
    updatePhone,
    savedAddresses,
    addAddress,
    deleteAddress,
    setDefaultAddress,
  } = useCustomerAuth();
  const { currentUser: adminUser, isAuthenticated: isAdminAuth, logout: adminLogout } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'admin'>('signin');

  // Customer Sign In Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Sign Up Form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [regError, setRegError] = useState<string | null>(null);

  // Customer Profile Editing State
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  // Add Address Modal / Form State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrGov, setAddrGov] = useState('القاهرة');
  const [addrCity, setAddrCity] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrFloor, setAddrFloor] = useState('');
  const [addrNotes, setAddrNotes] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  const handleCustomerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!cleanEmail || !pass) {
      setLoginError(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      return;
    }

    setIsSubmitting(true);
    const result = await customerLogin(cleanEmail, pass);
    setIsSubmitting(false);

    if (!result.success) {
      setLoginError(result.error || (language === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials'));
    } else {
      showToast(
        language === 'ar' ? 'تم تسجيل الدخول بنجاح! أهلاً بك في شنطتي' : 'Logged in successfully! Welcome to Shantety',
        'success'
      );
    }
  };

  const handleCustomerSignUp = async (e: React.FormEvent) => {
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
          : 'Please enter a valid 11-digit Egyptian phone number starting with 01'
      );
      return;
    }

    setIsSubmitting(true);
    const result = await customerRegister({
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: regEmail.trim(),
      password: regPassword,
      governorate,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setRegError(result.error || (language === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed'));
    } else {
      showToast(
        language === 'ar' ? `تم إنشاء حسابك بنجاح! أهلاً بك يا ${fullName}` : `Account created! Welcome ${fullName}`,
        'success'
      );
    }
  };

  const handleSavePhone = async () => {
    const clean = newPhone.replace(/\D/g, '');
    if (!clean.startsWith('01') || clean.length !== 11) {
      showToast(
        language === 'ar' ? 'رقم الهاتف يجب أن يكون 11 رقماً ويبدأ بـ 01' : 'Phone must be 11 digits starting with 01',
        'error'
      );
      return;
    }
    await updatePhone(clean);
    setIsEditingPhone(false);
    showToast(language === 'ar' ? 'تم تحديث رقم الهاتف بنجاح' : 'Phone updated successfully', 'success');
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrRecipient || !addrPhone || !addrCity || !addrStreet) {
      showToast(language === 'ar' ? 'يرجى استكمال بيانات العنوان' : 'Please fill required address fields', 'error');
      return;
    }

    await addAddress({
      customer_name: addrRecipient,
      phone: addrPhone,
      governorate: addrGov,
      city: addrCity,
      street_address: addrStreet,
      building_floor: addrFloor || undefined,
      notes: addrNotes || undefined,
      is_default: addrIsDefault,
    });

    setShowAddAddress(false);
    setAddrRecipient('');
    setAddrPhone('');
    setAddrCity('');
    setAddrStreet('');
    setAddrFloor('');
    setAddrNotes('');
    showToast(language === 'ar' ? 'تمت إضافة العنوان بنجاح' : 'Address added successfully', 'success');
  };

  const handleLogout = async () => {
    await customerLogout();
    if (isAdminAuth) {
      await adminLogout();
    }
    showToast(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out', 'info');
  };

  // IF CUSTOMER OR ADMIN IS LOGGED IN
  if (isCustomerAuth || isAdminAuth) {
    const displayName = customer?.fullName || adminUser?.displayName || 'عميل شنطتي';
    const email = customer?.email || adminUser?.email || '';
    const phoneDisplay = customer?.phone || '01010070812';

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fadeIn text-xs space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="bg-[#18181B] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#E10600] text-white font-bold text-xl flex items-center justify-center shadow-md">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black">{displayName}</h2>
                  {adminUser && (
                    <span className="bg-red-500/20 text-red-400 font-bold px-2.5 py-0.5 rounded text-[10px] border border-red-500/30">
                      {language === 'ar' ? adminUser.roleTitleAr : adminUser.roleTitleEn}
                    </span>
                  )}
                  {!adminUser && (
                    <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px]">
                      {language === 'ar' ? 'حساب عميل موثق' : 'Verified Customer'}
                    </span>
                  )}
                </div>
                <p className="text-stone-400 text-xs mt-0.5">{email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="py-2 px-3.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* If user is Admin, prominent dashboard access */}
            {isAdminAuth && (
              <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E10600] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 block text-sm">
                      {language === 'ar' ? 'لوحة تحكم إدارة المتجر (Shantety Manager)' : 'Store Management Dashboard'}
                    </span>
                    <span className="text-[11px] text-stone-600">
                      {language === 'ar'
                        ? 'إدارة المنتجات، الطلبات، المخزون، والموردين'
                        : 'Authoritative control over catalog, orders, stock, and suppliers'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentView('admin')}
                  className="py-2.5 px-5 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
                >
                  <span>{language === 'ar' ? 'فتح لوحة الإدارة' : 'Open Admin Panel'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            )}

            {/* Customer Details & Phone Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  {language === 'ar' ? 'رقم الهاتف المسجل للتوصيل' : 'Registered Mobile Number'}
                </span>
                <div className="flex items-center justify-between">
                  {isEditingPhone ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="01012345678"
                        className="p-1.5 border border-stone-300 rounded text-xs font-mono w-full"
                      />
                      <button
                        onClick={handleSavePhone}
                        className="py-1.5 px-3 bg-[#E10600] text-white rounded font-bold cursor-pointer"
                      >
                        {language === 'ar' ? 'حفظ' : 'Save'}
                      </button>
                      <button
                        onClick={() => setIsEditingPhone(false)}
                        className="py-1.5 px-2 bg-stone-200 text-stone-700 rounded cursor-pointer"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-mono text-sm font-bold text-stone-900">{phoneDisplay}</span>
                      <button
                        onClick={() => {
                          setNewPhone(phoneDisplay);
                          setIsEditingPhone(true);
                        }}
                        className="text-[#E10600] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  {language === 'ar' ? 'المحافظة الأساسية' : 'Primary Governorate'}
                </span>
                <span className="text-sm font-bold text-stone-900 block">
                  {customer?.governorate || 'القاهرة'}
                </span>
              </div>
            </div>

            {/* Saved Addresses Section */}
            <div className="space-y-4 pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-stone-900 text-sm">
                    {language === 'ar' ? 'عناويني المحفوظة للتوصيل' : 'Saved Shipping Addresses'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {language === 'ar'
                      ? 'اختر العنوان الافتراضي لتسهيل وسرعة إتمام الطلبات'
                      : 'Manage multiple addresses and set your primary default'}
                  </p>
                </div>

                <button
                  onClick={() => setShowAddAddress(!showAddAddress)}
                  className="py-2 px-3 bg-stone-900 hover:bg-[#E10600] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة عنوان جديد' : 'Add New Address'}</span>
                </button>
              </div>

              {/* Add Address Form Modal / Accordion */}
              {showAddAddress && (
                <form
                  onSubmit={handleAddAddressSubmit}
                  className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3 animate-fadeIn"
                >
                  <h4 className="font-bold text-stone-900 text-xs">
                    {language === 'ar' ? 'بيانات العنوان الجديد:' : 'New Address Details:'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'اسم المستلم' : 'Recipient Name'}
                      value={addrRecipient}
                      onChange={(e) => setAddrRecipient(e.target.value)}
                      className="p-2.5 rounded-lg border border-stone-300 text-xs"
                    />
                    <input
                      type="tel"
                      required
                      placeholder={language === 'ar' ? 'رقم الهاتف (01x)' : 'Mobile Phone'}
                      value={addrPhone}
                      onChange={(e) => setAddrPhone(e.target.value)}
                      className="p-2.5 rounded-lg border border-stone-300 text-xs font-mono"
                    />
                    <select
                      value={addrGov}
                      onChange={(e) => setAddrGov(e.target.value)}
                      className="p-2.5 rounded-lg border border-stone-300 text-xs bg-white"
                    >
                      {EGYPTIAN_GOVERNORATES.map((g) => (
                        <option key={g.name_ar} value={g.name_ar}>
                          {language === 'ar' ? g.name_ar : g.name_en}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'المدينة / الحي' : 'City / District'}
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      className="p-2.5 rounded-lg border border-stone-300 text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={language === 'ar' ? 'اسم الشارع والتفاصيل' : 'Street Address'}
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-stone-300 text-xs"
                  />
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                      <input
                        type="checkbox"
                        checked={addrIsDefault}
                        onChange={(e) => setAddrIsDefault(e.target.checked)}
                        className="rounded text-[#E10600]"
                      />
                      <span>{language === 'ar' ? 'تعيين كعنوان افتراضي' : 'Set as default address'}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        className="py-1.5 px-3 bg-stone-200 text-stone-700 font-bold rounded-lg cursor-pointer"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="py-1.5 px-4 bg-[#E10600] text-white font-bold rounded-lg cursor-pointer"
                      >
                        {language === 'ar' ? 'حفظ العنوان' : 'Save Address'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Addresses List */}
              {savedAddresses.length === 0 ? (
                <div className="p-6 bg-stone-50 rounded-xl text-center text-stone-500 border border-stone-200/60">
                  <MapPin className="w-6 h-6 mx-auto mb-2 text-stone-400" />
                  <p>{language === 'ar' ? 'لم تقم بحفظ أي عناوين بعد. يمكنك إضافة عنوانك الآن لتسهيل الشحن.' : 'No saved addresses yet.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-xl border relative transition-all ${
                        addr.is_default
                          ? 'border-[#E10600] bg-red-50/20 shadow-xs'
                          : 'border-stone-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-stone-900 text-xs">{addr.customer_name}</span>
                        {addr.is_default ? (
                          <span className="bg-[#E10600] text-white font-bold text-[9px] px-2 py-0.5 rounded">
                            {language === 'ar' ? 'الافتراضي' : 'Default'}
                          </span>
                        ) : (
                          <button
                            onClick={() => setDefaultAddress(addr.id)}
                            className="text-[10px] text-stone-500 hover:text-[#E10600] underline cursor-pointer"
                          >
                            {language === 'ar' ? 'جعله افتراضياً' : 'Set as default'}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        {addr.street_address}، {addr.city}، {addr.governorate}
                      </p>
                      <p className="text-[10px] text-stone-400 font-mono mt-1">{addr.phone}</p>
                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-end">
                        <button
                          onClick={() => deleteAddress(addr.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                          title={language === 'ar' ? 'حذف العنوان' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
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
                    {language === 'ar' ? 'متابعة بوليصات بوسطة ومايلرز' : 'Live tracking via Bosta & Mylerz'}
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
                    {language === 'ar' ? 'الشنط والأحذية التي قمتِ بحفظها' : 'Your saved favorite items'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GUEST SIGN IN / SIGN UP FORM
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
                ? 'حساب العميل الموحد ومتابعة الطلبات المباشرة'
                : 'Customer Account & Real-Time Tracking'}
            </p>
          </div>
        </div>

        {/* Tabs: Sign In vs Sign Up vs Admin Portal */}
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
          <button
            type="button"
            onClick={() => {
              setCurrentView('admin');
            }}
            className="flex-1 py-3 text-center border-b-2 border-transparent text-stone-500 hover:text-[#E10600] hover:bg-stone-100/60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
            <span>{language === 'ar' ? 'بوابة الإدارة' : 'Admin Portal'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* TAB 1: SIGN IN */}
          {activeTab === 'signin' && (
            <form onSubmit={handleCustomerSignIn} className="space-y-4 animate-fadeIn">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">
                  {language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full py-2.5 ps-10 pe-4 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 text-xs block">
                    {language === 'ar' ? 'كلمة المرور *' : 'Password *'}
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 ps-10 pe-10 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-stone-400 hover:text-stone-600 absolute end-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 disabled:opacity-50 mt-2"
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
            <form onSubmit={handleCustomerSignUp} className="space-y-3.5 animate-fadeIn">
              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">
                  {language === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: ياسمين خيري' : 'e.g. Yasmine Khairy'}
                  className="w-full py-2.5 px-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">
                  {language === 'ar' ? 'رقم الهاتف المصري *' : 'Egyptian Phone *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full py-2.5 px-3 rounded-xl border border-stone-300 bg-white text-stone-900 font-mono text-xs focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">
                  {language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full py-2.5 px-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">
                  {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
                </label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                >
                  {EGYPTIAN_GOVERNORATES.map((g) => (
                    <option key={g.name_ar} value={g.name_ar}>
                      {language === 'ar' ? g.name_ar : g.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">
                  {language === 'ar' ? 'كلمة المرور *' : 'Password *'}
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 px-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:outline-hidden focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#E10600] hover:bg-[#c20500] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 mt-3 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? (language === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating...')
                    : (language === 'ar' ? 'إنشاء حساب جديد' : 'Create My Account')}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
