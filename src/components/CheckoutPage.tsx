import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StoreDatabase } from '../services/storeDatabase';
import { EGYPTIAN_GOVERNORATES, OFFICIAL_BRAND } from '../data/initialData';
import { PaymentMethod } from '../types/ecommerce';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  User,
  MapPin,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const {
    language,
    cart,
    cartSubtotal,
    formatPrice,
    clearCart,
    setCurrentView,
    setActiveOrder,
    showToast,
  } = useStore();
  const {
    customer,
    isAuthenticated,
    savedAddresses,
    defaultAddress,
    register,
  } = useCustomerAuth();

  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [selectedGov, setSelectedGov] = useState(
    customer?.governorate || defaultAddress?.governorate || 'القاهرة'
  );
  const [city, setCity] = useState(defaultAddress?.city || '');
  const [streetAddress, setStreetAddress] = useState(defaultAddress?.street_address || '');
  const [buildingFloor, setBuildingFloor] = useState(defaultAddress?.building_floor || '');
  const [deliveryNotes, setDeliveryNotes] = useState(defaultAddress?.delivery_notes || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guest Account Creation State
  const [createAccount, setCreateAccount] = useState(false);
  const [guestPassword, setGuestPassword] = useState('');
  const [guestPasswordConfirm, setGuestPasswordConfirm] = useState('');

  // Prepopulate verified customer profile and default address dynamically
  useEffect(() => {
    if (customer) {
      if (!fullName) setFullName(customer.fullName || '');
      if (!phone) setPhone(customer.phone || '');
      if (!email) setEmail(customer.email || '');
      if (defaultAddress) {
        if (!city) setCity(defaultAddress.city || '');
        if (!streetAddress) setStreetAddress(defaultAddress.street_address || '');
        if (!buildingFloor) setBuildingFloor(defaultAddress.building_floor || '');
        if (!deliveryNotes) setDeliveryNotes(defaultAddress.delivery_notes || '');
        if (defaultAddress.governorate) setSelectedGov(defaultAddress.governorate);
      }
    }
  }, [customer, defaultAddress]);

  // Dynamic shipping calculation
  const govData = EGYPTIAN_GOVERNORATES.find(
    (g) => g.name_ar === selectedGov || g.name_en === selectedGov
  );
  let shippingFee = govData ? govData.fee : 65;
  if (cartSubtotal >= OFFICIAL_BRAND.free_shipping_threshold) {
    shippingFee = 0;
  }
  const grandTotal = cartSubtotal + shippingFee;

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-stone-900 mb-2">
          {language === 'ar' ? 'لا توجد منتجات في حقيبة التسوق' : 'Your cart is empty'}
        </h2>
        <p className="text-xs text-stone-500 mb-6">
          {language === 'ar'
            ? 'يرجى اختيار بعض القطع الفاخرة قبل متابعة الدفع'
            : 'Please add items before proceeding to checkout.'}
        </p>
        <button
          onClick={() => setCurrentView('shop')}
          className="px-6 py-2.5 bg-[#E10600] text-white text-xs font-bold rounded-lg cursor-pointer"
        >
          {language === 'ar' ? 'الذهاب للمتجر' : 'Return to Shop'}
        </button>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate guest registration if requested
    if (!isAuthenticated && createAccount) {
      if (!email.trim()) {
        setErrorMessage(
          language === 'ar'
            ? 'يرجى إدخال بريدك الإلكتروني لإنشاء الحساب'
            : 'Email address is required for account creation'
        );
        return;
      }
      if (guestPassword.length < 8) {
        setErrorMessage(
          language === 'ar'
            ? 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل'
            : 'Password must be at least 8 characters'
        );
        return;
      }
      if (guestPassword !== guestPasswordConfirm) {
        setErrorMessage(
          language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'
        );
        return;
      }
    }

    setIsSubmitting(true);

    const rawCartItems = cart.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));

    try {
      // 1. Build auth headers - extract verified session token if customer is authenticated
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'chk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      };

      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
        } catch (authErr) {
          console.warn('Could not read client session token:', authErr);
        }
      }

      // 2. Submit order to server (customer_id is derived server-side from Bearer token!)
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_name: fullName.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || undefined,
          shipping_address: {
            id: 'addr-' + Date.now(),
            customer_name: fullName.trim(),
            phone: phone.trim(),
            governorate: selectedGov,
            city: city.trim(),
            street_address: streetAddress.trim(),
            building_floor: buildingFloor.trim() || undefined,
            notes: deliveryNotes.trim() || undefined,
            is_default: true,
          },
          payment_method: paymentMethod,
          notes: deliveryNotes.trim() || undefined,
          cartItems: rawCartItems,
        }),
      });

      const result = await response.json();
      setIsSubmitting(false);

      if (!response.ok || !result.success || !result.order) {
        const err = language === 'ar' ? result.error_ar : result.error_en;
        setErrorMessage(err || (language === 'ar' ? 'فشل إتمام الطلب' : 'Failed to place order'));
        showToast(err || 'Order submission error', 'error');
        return;
      }

      // 3. If guest opted to create an account, attempt decoupled registration
      if (!isAuthenticated && createAccount && email) {
        try {
          const regResult = await register({
            fullName: fullName.trim(),
            email: email.trim(),
            password: guestPassword,
            phone: phone.trim(),
            governorate: selectedGov,
          });

          if (regResult.success) {
            showToast(
              language === 'ar'
                ? 'تم إنشاء حسابك وتأكيد طلبك بنجاح!'
                : 'Account created & order confirmed!',
              'success'
            );
          } else {
            // SAFE DECOUPLING: DO NOT FAIL ORDER!
            showToast(
              language === 'ar'
                ? `تم تأكيد طلبك بنجاح! (${regResult.error || 'تعذر إنشاء الحساب'})`
                : `Order confirmed! (${regResult.error || 'Account creation incomplete'})`,
              'info'
            );
          }
        } catch (regErr: any) {
          console.warn('Decoupled registration attempt error:', regErr);
        }
      }

      // Success: Clear cart, set active order, and navigate to confirmation
      clearCart();
      setActiveOrder(result.order);
      setCurrentView('order-confirmation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setIsSubmitting(false);
      const networkMsg = language === 'ar'
        ? 'حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.'
        : 'Network error communicating with server.';
      setErrorMessage(networkMsg);
      showToast(networkMsg, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-3xl mx-auto mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
          {language === 'ar' ? 'إتمام الطلب السريع والآمن' : 'Express Secure Checkout'}
        </h1>
        <p className="text-xs text-stone-500 mt-1 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {language === 'ar'
              ? 'معاينة المنتجات متاحة عند الاستلام · بياناتك مشفرة ومحمية بنسبة 100%'
              : 'Product inspection on delivery · 100% Encrypted & Protected'}
          </span>
        </p>
      </div>

      {errorMessage && (
        <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Authenticated Customer Verified Banner */}
      {isAuthenticated && customer && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {customer.fullName ? customer.fullName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <span className="font-bold block text-sm">
                {language === 'ar' ? `أهلاً بكِ مجدداً، ${customer.fullName}` : `Welcome back, ${customer.fullName}`}
              </span>
              <span className="text-[11px] text-emerald-700">
                {language === 'ar'
                  ? 'تم استرجاع بياناتك وعنوانك المعتمد تلقائياً. يمكنك مراجعتها وتعديلها بحرية قبل التأكيد.'
                  : 'Your delivery info has been automatically prepopulated from your verified account.'}
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold">
            {language === 'ar' ? 'حساب عميل موثق' : 'Verified Customer'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customer and Delivery Information (cols-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Customer Contact Info */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <span className="w-5 h-5 rounded-full bg-[#E10600] text-white flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span>{language === 'ar' ? 'بيانات العميل والتواصل' : 'Customer Details'}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: فاطمة إبراهيم' : 'e.g. Fatima Ibrahim'}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'رقم الهاتف المصري *' : 'Egyptian Mobile Number *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] font-mono"
                />
                <span className="text-[10px] text-stone-400">
                  {language === 'ar' ? '11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015' : '11 digits starting with 01x'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">
                {language === 'ar' ? 'البريد الإلكتروني (لاستلام الفاتورة وتتبع الشحنة)' : 'Email Address (For invoice & tracking)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600]"
              />
            </div>

            {/* Optional Guest Account Creation for Non-Logged-in Shoppers */}
            {!isAuthenticated && (
              <div className="pt-3 border-t border-stone-100">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-[#E10600] focus:ring-[#E10600]"
                  />
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">
                      {language === 'ar'
                        ? 'إنشاء حساب جديد ومتابعة طلباتي بسهولة'
                        : 'Create an account to track orders easily'}
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      {language === 'ar'
                        ? 'اختياري — لحفظ العناوين ومتابعة الطلبات وتجربة شراء أسرع في المرات القادمة.'
                        : 'Optional — save addresses, track order progress, and speed up future checkouts.'}
                    </span>
                  </div>
                </label>

                {createAccount && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-stone-100 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700">
                        {language === 'ar' ? 'كلمة المرور للحساب الجديد *' : 'Password (min 8 chars) *'}
                      </label>
                      <input
                        type="password"
                        required={createAccount}
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700">
                        {language === 'ar' ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                      </label>
                      <input
                        type="password"
                        required={createAccount}
                        value={guestPasswordConfirm}
                        onChange={(e) => setGuestPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Egyptian Delivery Address */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <span className="w-5 h-5 rounded-full bg-[#E10600] text-white flex items-center justify-center text-[10px] font-black">
                2
              </span>
              <span>{language === 'ar' ? 'عنوان التوصيل في مصر' : 'Egyptian Delivery Address'}</span>
            </h2>

            {/* Saved Addresses Quick Selector for Authenticated Customers */}
            {isAuthenticated && savedAddresses.length > 0 && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 mb-2">
                <span className="text-[11px] font-bold text-stone-600 block mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E10600]" />
                  <span>{language === 'ar' ? 'اختيار عنوان محفوظ في حسابك:' : 'Select from your saved addresses:'}</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedGov === addr.governorate && city === addr.city && streetAddress === addr.street_address;
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setSelectedGov(addr.governorate);
                          setCity(addr.city);
                          setStreetAddress(addr.street_address);
                          setBuildingFloor(addr.building_floor || '');
                          setDeliveryNotes(addr.delivery_notes || '');
                        }}
                        className={`p-2.5 rounded-lg border text-start text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#E10600] bg-white ring-1 ring-[#E10600] shadow-xs'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <span className="font-bold block text-stone-900 truncate">
                          {addr.city} — {addr.governorate}
                        </span>
                        <span className="text-[11px] text-stone-500 block truncate">
                          {addr.street_address}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
                </label>
                <select
                  value={selectedGov}
                  onChange={(e) => setSelectedGov(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-[#E10600]"
                >
                  {EGYPTIAN_GOVERNORATES.map((gov) => (
                    <option key={gov.name_en} value={gov.name_ar}>
                      {language === 'ar' ? gov.name_ar : gov.name_en} — {gov.fee} EGP ({gov.delivery_days_min}-{gov.delivery_days_max} أيام)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'المدينة / الحي / المنطقة *' : 'City / District *'}
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: المعادي / التجمع الخامس / سموحة' : 'e.g. Maadi, Heliopolis, Smouha'}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">
                {language === 'ar' ? 'اسم الشارع والتفاصيل *' : 'Street Address *'}
              </label>
              <input
                type="text"
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: شارع النصر، متفرع من اللاسلكي' : 'e.g. El-Nasr St, Near Metro Station'}
                className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'رقم العمارة والدور والشقة' : 'Building, Floor & Apartment'}
                </label>
                <input
                  type="text"
                  value={buildingFloor}
                  onChange={(e) => setBuildingFloor(e.target.value)}
                  placeholder={language === 'ar' ? 'عمارة 15، الدور الثالث، شقة 6' : 'Bldg 15, Floor 3, Apt 6'}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'ملاحظات لمندوب الشحن' : 'Delivery Notes'}
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'الاتصال قبل المجيء بساعة' : 'Call 1 hour before arrival'}
                  className="w-full text-xs p-3 rounded-lg border border-stone-300 focus:outline-none focus:border-[#E10600]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <span className="w-5 h-5 rounded-full bg-[#E10600] text-white flex items-center justify-center text-[10px] font-black">
                3
              </span>
              <span>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</span>
            </h2>

            <div className="space-y-3">
              {/* Option 1: COD */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-[#E10600] bg-red-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 text-[#E10600] focus:ring-[#E10600]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-[#E10600]" />
                    <span className="text-xs font-bold text-stone-900">
                      {language === 'ar'
                        ? 'الدفع عند الاستلام (Cash on Delivery) - مجاناً بدون رسوم إضافية'
                        : 'Cash on Delivery (COD) - Free with no added fees'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {language === 'ar'
                      ? 'ادفع نقداً لمندوب الشحن بعد استلام ومعاينة طلبك بكل ثقة وراحة.'
                      : 'Pay cash to courier after inspecting your order at your doorstep.'}
                  </p>
                </div>
              </label>

              {/* Option 2: Paymob Online Card */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'card_paymob'
                    ? 'border-[#E10600] bg-red-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card_paymob'}
                  onChange={() => setPaymentMethod('card_paymob')}
                  className="mt-1 text-[#E10600] focus:ring-[#E10600]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#E10600]" />
                    <span className="text-xs font-bold text-stone-900">
                      {language === 'ar'
                        ? 'البطاقات البنكية (Visa / MasterCard / ميزة عبر بوابة Paymob)'
                        : 'Credit / Debit Cards (Visa, MasterCard, Meeza via Paymob)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {language === 'ar'
                      ? 'دفع فوري مشفر بأعلى معايير أمان 3D Secure وبنوك البنك المركزي المصري.'
                      : 'Encrypted checkout supporting local Meeza and international cards.'}
                  </p>
                </div>
              </label>

              {/* Option 3: Smart Wallets / InstaPay */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'instapay_vodafone'
                    ? 'border-[#E10600] bg-red-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'instapay_vodafone'}
                  onChange={() => setPaymentMethod('instapay_vodafone')}
                  className="mt-1 text-[#E10600] focus:ring-[#E10600]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#E10600]" />
                    <span className="text-xs font-bold text-stone-900">
                      {language === 'ar'
                        ? 'المحافظ الإلكترونية (فودافون كاش / إنستاباي InstaPay / أورنج كاش)'
                        : 'Mobile Wallets & InstaPay (Vodafone Cash, Orange, InstaPay)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {language === 'ar'
                      ? 'تحويل فوري مباشر وآمن من أي محفظة هاتف ذكي في مصر.'
                      : 'Direct instant payment from any Egyptian mobile wallet.'}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order (cols-5) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center justify-between">
              <span>{language === 'ar' ? 'ملخص مشترياتك' : 'Order Summary'}</span>
              <span className="text-xs font-semibold text-stone-500 tabular-nums">
                ({cart.reduce((s, i) => s + i.quantity, 0)} {language === 'ar' ? 'قطع' : 'items'})
              </span>
            </h2>

            {/* Items mini list */}
            <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-stone-100 pr-1">
              {cart.map((item) => {
                const itemPrice = item.variant.sale_price || item.variant.price;
                return (
                  <div key={item.variant_id} className="pt-3 first:pt-0 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-stone-50 border border-stone-200 p-1 shrink-0">
                      <img
                        src={item.variant.image || item.product.images[0]}
                        alt={item.product.name_en}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {language === 'ar' ? item.product.name_ar : item.product.name_en}
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        {language === 'ar' ? 'الكمية:' : 'Qty:'} {item.quantity} ·{' '}
                        <span className="font-mono">{item.variant.sku}</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-stone-900 tabular-nums">
                      {formatPrice(itemPrice * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Calculations */}
            <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>{language === 'ar' ? 'مجموع المنتجات' : 'Subtotal'}</span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  {formatPrice(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {language === 'ar' ? 'الشحن إلى' : 'Shipping to'}{' '}
                    {language === 'ar' ? selectedGov : govData?.name_en}
                  </span>
                </span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  {shippingFee === 0
                    ? language === 'ar'
                      ? 'مجاناً'
                      : 'FREE'
                    : formatPrice(shippingFee)}
                </span>
              </div>
              {shippingFee === 0 && (
                <p className="text-[11px] text-emerald-800 font-medium">
                  {language === 'ar'
                    ? '✓ مؤهل للشحن المجاني (طلب فوق 1,500 ج.م)'
                    : '✓ Free delivery applied'}
                </p>
              )}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-stone-900">
                  {language === 'ar' ? 'الإجمالي النهائي المطلوب' : 'Grand Total'}
                </span>
                <p className="text-[10px] text-stone-600">
                  {language === 'ar' ? 'شامل ضريبة القيمة المضافة والتوصيل' : 'Inclusive of all taxes'}
                </p>
              </div>
              <span className="text-2xl font-black text-[#E10600] tabular-nums">
                {formatPrice(grandTotal)}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#E10600] hover:bg-[#C50500] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{language === 'ar' ? 'جاري حجز المخزون وتأكيد الطلب...' : 'Reserving stock...'}</span>
              ) : (
                <>
                  <span>
                    {paymentMethod === 'cod'
                      ? language === 'ar'
                        ? 'تأكيد الطلب مع الدفع عند الاستلام'
                        : 'Confirm Order (Pay on Delivery)'
                      : language === 'ar'
                      ? 'متابعة الدفع الإلكتروني الآمن'
                      : 'Pay Securely Online'}
                  </span>
                  {language === 'ar' ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </>
              )}
            </button>

            <div className="text-[11px] text-stone-600 text-center space-y-1">
              <p className="flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === 'ar'
                    ? 'يتم حجز مخزون القطع تلقائياً عند التأكيد'
                    : 'Stock is reserved atomically upon confirmation'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
